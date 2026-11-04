import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProgressForTests, useProgressStore, type ReviewCard } from '@/engine/progress/store';
import { routes } from '@/routes';

// jsdom has no WebGL, so the 3D view is stubbed.
vi.mock('@/engine/lesson/ModelViewport', () => ({ default: () => null }));

const PAST = '2026-01-01T09:00:00.000Z';
const FUTURE = '2999-01-01T09:00:00.000Z';

function card(overrides: Partial<ReviewCard> & Pick<ReviewCard, 'source'>): ReviewCard {
  const base = { lessonId: 'what-magnets-do', addedAt: PAST, box: 0, dueAt: PAST };
  return overrides.source === 'recall'
    ? { ...base, cardId: 'two-north-poles', ...overrides }
    : ({ ...base, termId: 'repulsion', ask: 'name', ...overrides } as ReviewCard);
}

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);
}

beforeEach(() => {
  clearProgressForTests();
});

describe('review page', () => {
  it('says how cards arrive when there are none', () => {
    renderAt('/review');
    expect(screen.getByText(/Nothing to review yet/)).toBeInTheDocument();
  });

  it('shows due cards one at a time, answer hidden until asked', async () => {
    const user = userEvent.setup();
    useProgressStore.setState({
      reviewQueue: [card({ source: 'recall' }), card({ source: 'term' })],
    });
    renderAt('/review');

    expect(screen.getByText('2 cards are due.', { exact: false })).toBeInTheDocument();
    const first = screen.getByRole('article', { name: 'Concept' });
    expect(first).toHaveTextContent('What happens when two north poles are brought together?');
    expect(within(first).getByRole('link', { name: 'What magnets do' })).toHaveAttribute(
      'href',
      '/module/em-fundamentals/lesson/what-magnets-do',
    );
    expect(first).not.toHaveTextContent('They push each other apart');

    await user.click(screen.getByRole('button', { name: 'Show the answer' }));
    expect(first).toHaveTextContent('They push each other apart');
    await user.click(screen.getByRole('button', { name: 'I remembered' }));

    // The term card: its definition, asking for the name.
    const second = screen.getByRole('article', { name: 'What is this called?' });
    expect(second).toHaveTextContent('The push between two like magnetic poles');
    await user.click(screen.getByRole('button', { name: 'Show the answer' }));
    expect(second).toHaveTextContent('Repulsion');
    await user.click(screen.getByRole('button', { name: 'Not yet' }));

    expect(screen.getByText(/Nothing is due. The next card is due tomorrow/)).toBeInTheDocument();
    const [remembered, forgotten] = useProgressStore.getState().reviewQueue;
    expect(remembered?.box).toBe(1);
    expect(forgotten?.box).toBe(0);
  });

  it('opens the lesson’s model to try on a prediction card', async () => {
    const user = userEvent.setup();
    useProgressStore.setState({
      reviewQueue: [card({ source: 'recall', lessonId: 'move-a-magnet', cardId: 'still-magnet' })],
    });
    renderAt('/review');
    expect(screen.getByRole('article', { name: 'Prediction' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try it on the model' }));
    expect(screen.getByRole('slider', { name: 'Magnet' })).toBeInTheDocument();
  });

  it('counts due cards on the Review link, on every screen', () => {
    useProgressStore.setState({
      reviewQueue: [
        card({ source: 'recall' }),
        card({ source: 'term' }),
        card({ source: 'term', ask: 'explain', dueAt: FUTURE }),
      ],
    });
    renderAt('/');
    expect(screen.getByLabelText('2 due')).toBeInTheDocument();
  });
});
