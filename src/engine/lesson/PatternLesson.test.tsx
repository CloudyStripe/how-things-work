import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProgressForTests, useProgressStore } from '@/engine/progress/store';
import { routes } from '@/routes';

// EM Fundamentals has no Pattern steps, so this runs a fixture module with numbers, as the
// Magnetism and Electricity modules will be.
vi.mock('@content/index', async () => ({
  content: (await import('@/test/fixtures/pattern-lesson')).patternContent,
}));
vi.mock('@/models/registry', async () => {
  const { dialModel } = await import('@/test/fixtures/pattern-lesson');
  return { models: { [dialModel.id]: dialModel } };
});
vi.mock('@/engine/lesson/ModelViewport', () => ({ default: () => null }));

const AT = '2026-11-03T12:00:00.000Z';

beforeEach(() => {
  clearProgressForTests();
  localStorage.clear();
});

describe('a Pattern step', () => {
  it("logs a row for each setting in the control's own order, then states the pattern", async () => {
    const user = userEvent.setup();
    useProgressStore.setState({
      lessons: { dial: { step: 'pattern', completedSteps: [], startedAt: AT, updatedAt: AT } },
    });
    render(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/module/fixture/lesson/dial'] })}
      />,
    );

    const table = await screen.findByRole('table', { name: 'Readings' });
    await waitFor(() => expect(within(table).getByRole('cell', { name: '1.0' })).toBeVisible());
    await user.click(screen.getByRole('radio', { name: 'High' }));
    await user.click(screen.getByRole('radio', { name: 'Medium' }));

    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(4));
    const rows = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent);
    expect(rows).toEqual(['Low1.0', 'Medium2.0', 'High4.0']);
    // The statement holds a glossary term, so its text spans more than one element.
    expect(screen.getByText('Pattern:').closest('p')).toHaveTextContent(
      'Pattern: Doubling the level doubles the output.',
    );
  });
});
