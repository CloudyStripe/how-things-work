import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { emFundamentals } from '@content/modules/em-fundamentals/module';
import { clearProgressForTests, useProgressStore } from '@/engine/progress/store';
import { routes } from '@/routes';

const MAGNETS = 'what-magnets-do';
const AT = '2026-11-03T12:00:00.000Z';

function renderModule() {
  const router = createMemoryRouter(routes, { initialEntries: ['/module/em-fundamentals'] });
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  clearProgressForTests();
  localStorage.clear();
});

describe('module page', () => {
  it('shows the intro, the numbered lessons with their state, and the terms', () => {
    renderModule();
    expect(screen.getByRole('heading', { level: 1, name: 'EM Fundamentals' })).toBeInTheDocument();
    expect(screen.getByText(/spins magnets past coils of wire/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'The windmill' })).toHaveAttribute(
      'href',
      '/module/em-fundamentals/lesson/the-windmill',
    );
    expect(screen.getByRole('link', { name: 'What magnets do' })).toHaveAttribute(
      'href',
      `/module/em-fundamentals/lesson/${MAGNETS}`,
    );
    expect(screen.getAllByText('Not started')).toHaveLength(emFundamentals.lessons.length);
    expect(screen.getByRole('button', { name: 'magnetic pole' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'repulsion' })).toBeInTheDocument();
  });

  it('lists the lessons still to come, after the built ones, without links', () => {
    renderModule();
    const items = within(screen.getByRole('list', { name: 'Lessons' })).getAllByRole('listitem');
    const built = emFundamentals.lessons.length;
    expect(items).toHaveLength(10);
    expect(items[built]).toHaveTextContent('What current isComing later');
    expect(items[9]).toHaveTextContent('Back to the windmillComing later');
    expect(within(items[built] as HTMLElement).queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows how far a lesson has got', () => {
    useProgressStore.setState({
      lessons: { [MAGNETS]: { step: 'why', completedSteps: [], startedAt: AT, updatedAt: AT } },
    });
    renderModule();
    expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
  });

  it('resets the module only after confirmation', async () => {
    const user = userEvent.setup();
    useProgressStore.setState({
      lessons: {
        [MAGNETS]: { step: 'challenge', completedSteps: [], startedAt: AT, updatedAt: AT },
      },
      terms: { 'magnetic-pole': { lessonId: MAGNETS, at: AT } },
    });
    renderModule();

    await user.click(screen.getByRole('button', { name: 'Reset progress for this module' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset progress for this module' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getAllByText('Not started')).toHaveLength(emFundamentals.lessons.length);
    expect(useProgressStore.getState().lessons).toEqual({});
    expect(useProgressStore.getState().terms).toEqual({});
  });
});
