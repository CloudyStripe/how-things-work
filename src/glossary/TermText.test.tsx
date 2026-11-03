import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { TermText } from './TermText';

const TEXT = 'A magnetic pole pushes or pulls. Every magnetic pole does.';

describe('TermText', () => {
  it('turns every registered term into a hoverable definition', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TermText text={TEXT} />
      </MemoryRouter>,
    );

    const terms = screen.getAllByRole('button', { name: 'magnetic pole' });
    expect(terms).toHaveLength(2);

    await user.hover(terms[0] as HTMLElement);
    const popover = await screen.findByRole('group', { name: 'magnetic pole' });
    expect(popover).toHaveTextContent('where its push and pull are strongest');
    expect(screen.getByRole('link', { name: 'Introduced in What magnets do' })).toHaveAttribute(
      'href',
      '/module/em-fundamentals/lesson/what-magnets-do',
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'magnetic pole' })).not.toBeInTheDocument();
  });

  it('opens on keyboard focus and closes once the pointer leaves', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TermText text={TEXT} />
      </MemoryRouter>,
    );

    await user.tab();
    expect(await screen.findByRole('group', { name: 'magnetic pole' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    const [first] = screen.getAllByRole('button', { name: 'magnetic pole' });
    await user.hover(first as HTMLElement);
    expect(await screen.findByRole('group', { name: 'magnetic pole' })).toBeInTheDocument();
    await user.unhover(first as HTMLElement);
    await user.click(document.body);
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'magnetic pole' })).not.toBeInTheDocument(),
    );
  });

  it('highlights only the first appearance of a term being named', () => {
    render(
      <MemoryRouter>
        <TermText text={TEXT} naming={['magnetic-pole']} />
      </MemoryRouter>,
    );
    const [first, second] = screen.getAllByRole('button', { name: 'magnetic pole' });
    expect(first).toHaveClass('term-named');
    expect(second).not.toHaveClass('term-named');
  });
});
