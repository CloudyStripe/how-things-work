import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StepKind } from '@/engine/content/schema';
import { clearProgressForTests, useProgressStore } from '@/engine/progress/store';
import { useSimStore } from '@/engine/sim/store';
import { routes } from '@/routes';

// jsdom has no WebGL, so the 3D view is stubbed; the simulation runs regardless.
vi.mock('@/engine/experiment/ModelViewport', () => ({
  default: () => <div data-testid="model-viewport" />,
}));

const EXPERIMENT = 'placeholder-wire-compass';
const PATH = `/module/em-fundamentals/experiment/${EXPERIMENT}`;
const AT = '2026-11-02T12:00:00.000Z';

function renderExperiment() {
  const router = createMemoryRouter(routes, { initialEntries: [PATH] });
  render(<RouterProvider router={router} />);
}

/** Puts the learner at a step with the prediction already committed. */
function resumeAt(step: StepKind) {
  useProgressStore.setState({
    experiments: {
      [EXPERIMENT]: {
        step,
        completedSteps: [],
        prediction: { choice: 'turn', correct: true, at: AT },
        startedAt: AT,
        updatedAt: AT,
      },
    },
  });
}

beforeEach(() => {
  clearProgressForTests();
  localStorage.clear();
});

describe('experiment runner', () => {
  it('locks the model until a prediction is committed', async () => {
    const user = userEvent.setup();
    renderExperiment();

    expect(screen.getByRole('heading', { name: 'Step 1 of 8: Hook' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('heading', { name: 'Step 2 of 8: Predict' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Switch' })).toBeDisabled();
    expect(screen.getByText('Make your prediction to unlock the model.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Turn away from north' }));
    await user.click(screen.getByRole('button', { name: 'Commit prediction' }));

    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Switch' })).toBeEnabled();
    expect(screen.queryByText('Make your prediction to unlock the model.')).not.toBeInTheDocument();
    expect(useProgressStore.getState().experiments[EXPERIMENT]?.prediction).toMatchObject({
      choice: 'turn',
      correct: true,
    });
  });

  it('ticks off guided prompts as the model reaches them', async () => {
    const user = userEvent.setup();
    resumeAt('explore');
    renderExperiment();

    await user.click(screen.getByRole('switch', { name: 'Switch' }));

    await waitFor(() =>
      expect(screen.getByText('Close the switch.').closest('li')).toHaveClass('is-done'),
    );
    expect(screen.getByText('Raise the current to high.').closest('li')).not.toHaveClass('is-done');
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('names its terms and turns on its overlay at Reveal', async () => {
    resumeAt('reveal');
    renderExperiment();

    expect(screen.getByText(/You predicted:/)).toHaveTextContent(
      'You predicted: Turn away from north. That matches what happened.',
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Field direction' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
    expect(screen.getByText('Not to scale')).toBeInTheDocument();
    expect(useProgressStore.getState().terms['magnetic-field']?.experimentId).toBe(EXPERIMENT);
  });

  it('logs a Pattern row for each setting, keeping the current one live', async () => {
    const user = userEvent.setup();
    resumeAt('pattern');
    renderExperiment();
    const table = await screen.findByRole('table', { name: 'Readings' });

    await waitFor(() => expect(within(table).getByRole('cell', { name: '0.0' })).toBeVisible());
    await user.click(screen.getByRole('switch', { name: 'Switch' }));
    await waitFor(() => expect(within(table).getByRole('cell', { name: '10.0' })).toBeVisible());
    await user.click(screen.getByRole('radio', { name: 'Medium' }));
    await user.click(screen.getByRole('radio', { name: 'High' }));

    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(4));
    const rows = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent);
    expect(rows).toEqual(['Low10.0', 'Medium20.0', 'High40.0']);
    expect(screen.getByText(/Doubling the current doubles the field/)).toBeInTheDocument();
  });

  it('completes the challenge from simulation state', async () => {
    resumeAt('challenge');
    renderExperiment();
    expect(screen.getByText('Not solved yet. Keep adjusting the model.')).toBeInTheDocument();

    act(() => {
      const sim = useSimStore.getState();
      sim.setControl('switchClosed', true);
      sim.setControl('level', 'high');
      sim.setControl('reversed', true);
      for (let frame = 0; frame < 600; frame++) useSimStore.getState().advance(1 / 60);
    });

    expect(await screen.findByText('Challenge complete.')).toBeInTheDocument();
    expect(useProgressStore.getState().experiments[EXPERIMENT]?.challengeCompletedAt).toBeDefined();
  });

  it('resumes at the saved step and finishes on the module page', async () => {
    const user = userEvent.setup();
    resumeAt('recall');
    renderExperiment();

    expect(screen.getByRole('heading', { name: 'Step 8 of 8: Recall' })).toBeInTheDocument();
    expect(useProgressStore.getState().reviewQueue.map((card) => card.cardId)).toEqual([
      'why-compass-turns',
      'name-deflection',
    ]);

    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'EM Fundamentals' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });
});
