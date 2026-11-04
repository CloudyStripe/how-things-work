import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearProgressForTests, useProgressStore } from '@/engine/progress/store';
import { routes } from '@/routes';

const AT = '2026-11-04T09:00:00.000Z';

function renderGlossary() {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/glossary'] })} />);
}

beforeEach(() => {
  clearProgressForTests();
});

describe('glossary page', () => {
  it('says where terms come from before any are met', () => {
    renderGlossary();
    expect(screen.getByText(/Terms appear here as you meet them/)).toBeInTheDocument();
  });

  it('lists only the terms met, by module, each linking to the lesson that named it', () => {
    useProgressStore.setState({
      terms: {
        repulsion: { lessonId: 'what-magnets-do', at: AT },
        compass: { lessonId: 'what-a-compass-is', at: AT },
      },
    });
    renderGlossary();
    const module = screen.getByRole('region', { name: 'EM Fundamentals' });
    const entries = within(module).getAllByRole('article');
    expect(entries.map((entry) => within(entry).getByRole('heading').textContent)).toEqual([
      'Repulsion',
      'Compass',
    ]);
    expect(
      within(entries[1] as HTMLElement).getByRole('link', { name: 'What a compass is' }),
    ).toHaveAttribute('href', '/module/em-fundamentals/lesson/what-a-compass-is');
    expect(screen.queryByRole('heading', { name: 'Attraction' })).not.toBeInTheDocument();
  });

  it('sets confusable pairs side by side once both are met', async () => {
    const met = (lessonId: string) => ({ lessonId, at: AT });
    useProgressStore.setState({ terms: { generator: met('spin-it') } });
    renderGlossary();
    expect(screen.queryByRole('region', { name: 'Easily mixed up' })).not.toBeInTheDocument();

    useProgressStore.setState({
      terms: { generator: met('spin-it'), 'electric-motor': met('back-to-the-windmill') },
    });
    const pairs = await screen.findByRole('region', { name: 'Easily mixed up' });
    expect(within(pairs).getByRole('heading', { name: 'Generator' })).toBeInTheDocument();
    expect(within(pairs).getByRole('heading', { name: 'Electric motor' })).toBeInTheDocument();
  });
});
