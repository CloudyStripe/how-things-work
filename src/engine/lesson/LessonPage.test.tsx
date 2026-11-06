import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StepKind } from '@/engine/content/schema';
import { clearProgressForTests, reviewCardKey, useProgressStore } from '@/engine/progress/store';
import { useSimStore } from '@/engine/sim/store';
import { FAMILY_COLORS } from '@/models/colors';
import type { MagnetRailState } from '@/models/magnet-rail/definition';
import { routes } from '@/routes';

// jsdom has no WebGL, so the 3D view is stubbed; the simulation runs regardless.
vi.mock('@/engine/lesson/ModelViewport', () => ({
  default: () => <div data-testid="model-viewport" />,
}));

const MAGNETS = 'what-magnets-do';
const WINDMILL = 'the-windmill';
const AT = '2026-11-03T12:00:00.000Z';

function renderLesson(lessonId: string) {
  const router = createMemoryRouter(routes, {
    initialEntries: [`/module/em-fundamentals/lesson/${lessonId}`],
  });
  render(<RouterProvider router={router} />);
}

/** Puts the learner at a step of a lesson, with lesson 2's prediction already answered. */
function resumeAt(lessonId: string, step: StepKind) {
  useProgressStore.setState({
    lessons: {
      [lessonId]: {
        step,
        completedSteps: [],
        prediction: lessonId === MAGNETS ? { choice: 'away', correct: true, at: AT } : undefined,
        startedAt: AT,
        updatedAt: AT,
      },
    },
  });
}

/** Slides lesson 2's magnet from one position to another over `seconds` of simulation. */
function slide(from: number, to: number, seconds: number) {
  act(() => {
    const frames = Math.round(seconds * 60);
    for (let frame = 1; frame <= frames + 60; frame++) {
      const sim = useSimStore.getState();
      sim.setControl('position', from + (to - from) * Math.min(1, frame / frames));
      sim.advance(1 / 60);
    }
  });
}

function railState(): MagnetRailState {
  return useSimStore.getState().snapshot?.state as MagnetRailState;
}

beforeEach(() => {
  clearProgressForTests();
  localStorage.clear();
});

describe('a model lesson (lesson 2)', () => {
  it('starts with Look: the model is there to look at, not to work', () => {
    renderLesson(MAGNETS);
    expect(screen.getByRole('heading', { name: 'Step 1 of 5: Look' })).toBeInTheDocument();
    expect(screen.getByText(/a bar magnet in a holder/)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Your magnet' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset model' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('asks its prediction first in Try, and unlocks the model once it is answered', async () => {
    const user = userEvent.setup();
    renderLesson(MAGNETS);
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('heading', { name: 'Step 2 of 5: Try' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Your magnet' })).toBeDisabled();
    expect(screen.queryByText(/Slide your magnet slowly/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Roll away from your magnet' }));
    await user.click(screen.getByRole('button', { name: 'Commit prediction' }));

    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(screen.getByRole('slider', { name: 'Your magnet' })).toBeEnabled();
    expect(screen.getByText(/Slide your magnet slowly/)).toBeInTheDocument();
    // Answered, it takes one line, so the prompts stay in view.
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your prediction: Roll away from your magnet',
    );
    expect(screen.queryByRole('radio', { name: 'Stay where it is' })).not.toBeInTheDocument();
    expect(useProgressStore.getState().lessons[MAGNETS]?.prediction).toMatchObject({
      choice: 'away',
      correct: true,
    });
  });

  it('ticks off prompts as the model reaches them, through the side panel slider', async () => {
    resumeAt(MAGNETS, 'try');
    renderLesson(MAGNETS);
    const slider = screen.getByRole('slider', { name: 'Your magnet' });

    // A slow slide to the right, step by step, as a learner pressing the arrow key would.
    for (let value = 0.5; value <= 1.0001; value += 0.02) {
      fireEvent.change(slider, { target: { value: value.toFixed(2) } });
      act(() => {
        for (let frame = 0; frame < 6; frame++) useSimStore.getState().advance(1 / 60);
      });
    }

    await waitFor(() =>
      expect(screen.getByText(/toward the cart on the right/).closest('li')).toHaveClass('is-done'),
    );
    expect(screen.getByText(/toward the cart on the left/).closest('li')).not.toHaveClass(
      'is-done',
    );
    expect(railState().touchedRight).toBe(false);
  });

  it('names its terms and compares the prediction in Why', () => {
    resumeAt(MAGNETS, 'why');
    renderLesson(MAGNETS);

    expect(screen.getByText(/You predicted:/)).toHaveTextContent(
      'You predicted: Roll away from your magnet. That matches what happened.',
    );
    expect(screen.getByText(/Named here:/)).toHaveTextContent(
      'Named here: magnetic pole, repulsion, attraction',
    );
    expect(useProgressStore.getState().terms['magnetic-pole']?.lessonId).toBe(MAGNETS);
  });

  it('puts the model back as it started when the Challenge opens', async () => {
    const user = userEvent.setup();
    resumeAt(MAGNETS, 'world');
    renderLesson(MAGNETS);
    slide(0.5, 1, 4);
    expect(railState().rightCart.position.x).toBeGreaterThan(0.2);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Step 5 of 5: Challenge' })).toBeInTheDocument();
    expect(railState().rightCart.position.x).toBe(0.2);
    expect(screen.getByText('Not solved yet. Keep adjusting the model.')).toBeInTheDocument();
  });

  it('completes the challenge from simulation state, and not after a touch', async () => {
    resumeAt(MAGNETS, 'challenge');
    renderLesson(MAGNETS);

    slide(0.5, 1, 0); // a jump: the magnets touch
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(screen.getByText('Not solved yet. Keep adjusting the model.')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reset model' }));
    slide(0.5, 1, 4);
    expect(await screen.findByText('Challenge complete.')).toBeInTheDocument();
    expect(useProgressStore.getState().lessons[MAGNETS]?.challengeCompletedAt).toBeDefined();
  });

  it('queues its review cards quietly at Finish and returns to the module page', async () => {
    const user = userEvent.setup();
    resumeAt(MAGNETS, 'challenge');
    renderLesson(MAGNETS);
    expect(useProgressStore.getState().reviewQueue).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'EM Fundamentals' }),
    ).toBeInTheDocument();
    // Its three recall cards, and two cards for each of the three terms its Why names.
    expect(useProgressStore.getState().reviewQueue.map(reviewCardKey)).toEqual([
      'recall:what-magnets-do:two-north-poles',
      'recall:what-magnets-do:north-meets-south',
      'recall:what-magnets-do:name-the-ends',
      'term:magnetic-pole:name',
      'term:magnetic-pole:explain',
      'term:repulsion:name',
      'term:repulsion:explain',
      'term:attraction:name',
      'term:attraction:explain',
    ]);
    expect(useProgressStore.getState().lessons[MAGNETS]?.completedAt).toBeDefined();
  });
});

describe('an explorer lesson (lesson 1)', () => {
  it('keeps the take-apart tools off during Look', () => {
    renderLesson(WINDMILL);
    expect(screen.getByRole('heading', { name: 'Step 1 of 3: Look' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Exploded view' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove next part: Blades' })).toBeDisabled();
  });

  it('keeps its two-state controls off during Look', () => {
    renderLesson(WINDMILL);
    expect(screen.getByRole('radio', { name: 'Windy' })).toBeDisabled();
  });

  it('shows each part with a swatch of its colour family, and what the colours mean', async () => {
    const user = userEvent.setup();
    resumeAt(WINDMILL, 'try');
    renderLesson(WINDMILL);
    const legend = screen.getByRole('list', { name: 'What the colours mean' });
    expect(within(legend).getByText('Moving parts')).toBeInTheDocument();
    expect(within(legend).getByText('Electricity')).toBeInTheDocument();
    expect(within(legend).getByText('Structure')).toBeInTheDocument();

    const swatchOf = (element: HTMLElement) => element.querySelector('.swatch');
    const generator = screen.getByRole('button', { name: 'Generator' });
    const blades = screen.getByRole('button', { name: 'Blades' });
    expect(swatchOf(generator)).toHaveStyle({ backgroundColor: FAMILY_COLORS.electricity });
    expect(swatchOf(blades)).toHaveStyle({ backgroundColor: FAMILY_COLORS.motion });

    await user.click(generator);
    expect(
      within(screen.getByRole('region', { name: 'Generator' })).getByText('Electricity'),
    ).toBeInTheDocument();
  });

  it('takes the model apart, names parts, and ticks prompts from what the learner did', async () => {
    const user = userEvent.setup();
    resumeAt(WINDMILL, 'try');
    renderLesson(WINDMILL);
    expect(screen.getByRole('heading', { name: 'Step 2 of 3: Try' })).toBeInTheDocument();

    // Both states of the wind are on show, and picking one says which is on.
    const wind = screen.getByRole('radiogroup', { name: 'Wind' });
    expect(within(wind).getByRole('radio', { name: 'Calm' })).toBeChecked();
    await user.click(within(wind).getByRole('radio', { name: 'Windy' }));
    expect(within(wind).getByRole('radio', { name: 'Windy' })).toBeChecked();
    act(() => {
      for (let frame = 0; frame < 600; frame++) useSimStore.getState().advance(1 / 60);
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Exploded view' }), {
      target: { value: '1' },
    });
    await user.click(screen.getByRole('button', { name: 'Generator' }));
    expect(screen.getByRole('region', { name: 'Generator' })).toHaveTextContent(
      'Turns spinning into electricity.',
    );

    for (const part of ['Blades', 'Hub', 'Nacelle cover', 'Main shaft', 'Gearbox']) {
      await user.click(screen.getByRole('button', { name: `Remove next part: ${part}` }));
    }
    expect(screen.getByRole('button', { name: 'Remove next part: Generator' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Put back: Gearbox' })).toBeEnabled();

    await waitFor(() => {
      const done = screen.getAllByRole('listitem').filter((item) => item.matches('.is-done'));
      expect(done).toHaveLength(4);
    });
  });
});
