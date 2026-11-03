import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearProgressForTests, useProgressStore } from '@/engine/progress/store';
import { routes } from '@/routes';

const EXPERIMENT = 'placeholder-wire-compass';
const AT = '2026-11-02T12:00:00.000Z';

function renderModule() {
  const router = createMemoryRouter(routes, { initialEntries: ['/module/em-fundamentals'] });
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  clearProgressForTests();
  localStorage.clear();
});

describe('module page', () => {
  it('shows the intro, the experiments with their state, and the terms', () => {
    renderModule();
    expect(screen.getByRole('heading', { level: 1, name: 'EM Fundamentals' })).toBeInTheDocument();
    expect(screen.getByText(/spins magnets past coils of wire/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Placeholder: a wire and a compass' })).toHaveAttribute(
      'href',
      `/module/em-fundamentals/experiment/${EXPERIMENT}`,
    );
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'magnetic field' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'compass deflection' })).toBeInTheDocument();
  });

  it('shows how far an experiment has got', () => {
    useProgressStore.setState({
      experiments: {
        [EXPERIMENT]: { step: 'explore', completedSteps: [], startedAt: AT, updatedAt: AT },
      },
    });
    renderModule();
    expect(screen.getByText('Step 3 of 8')).toBeInTheDocument();
  });

  it('resets the module only after confirmation', async () => {
    const user = userEvent.setup();
    useProgressStore.setState({
      experiments: {
        [EXPERIMENT]: { step: 'recall', completedSteps: [], startedAt: AT, updatedAt: AT },
      },
      terms: { 'magnetic-field': { experimentId: EXPERIMENT, at: AT } },
    });
    renderModule();

    await user.click(screen.getByRole('button', { name: 'Reset progress for this module' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Step 8 of 8')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset progress for this module' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(useProgressStore.getState().experiments).toEqual({});
    expect(useProgressStore.getState().terms).toEqual({});
  });
});
