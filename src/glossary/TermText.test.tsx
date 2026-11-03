import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { TermText } from './TermText';

const TEXT = 'A magnetic field turns the needle. Every magnetic field does.';

describe('TermText', () => {
  it('turns every registered term into a hoverable definition', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TermText text={TEXT} />
      </MemoryRouter>,
    );

    const terms = screen.getAllByRole('button', { name: 'magnetic field' });
    expect(terms).toHaveLength(2);

    await user.hover(terms[0] as HTMLElement);
    const popover = await screen.findByRole('group', { name: 'magnetic field' });
    expect(popover).toHaveTextContent('where a compass needle feels a turning force');
    expect(screen.getByRole('link', { name: /Introduced in Placeholder/ })).toHaveAttribute(
      'href',
      '/module/em-fundamentals/experiment/placeholder-wire-compass',
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'magnetic field' })).not.toBeInTheDocument();
  });

  it('opens on keyboard focus and closes once the pointer leaves', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TermText text={TEXT} />
      </MemoryRouter>,
    );

    await user.tab();
    expect(await screen.findByRole('group', { name: 'magnetic field' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    const [first] = screen.getAllByRole('button', { name: 'magnetic field' });
    await user.hover(first as HTMLElement);
    expect(await screen.findByRole('group', { name: 'magnetic field' })).toBeInTheDocument();
    await user.unhover(first as HTMLElement);
    await user.click(document.body);
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'magnetic field' })).not.toBeInTheDocument(),
    );
  });

  it('highlights only the first appearance of a term being named', () => {
    render(
      <MemoryRouter>
        <TermText text={TEXT} naming={['magnetic-field']} />
      </MemoryRouter>,
    );
    const [first, second] = screen.getAllByRole('button', { name: 'magnetic field' });
    expect(first).toHaveClass('term-named');
    expect(second).not.toHaveClass('term-named');
  });
});
