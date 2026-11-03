import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { routes } from './routes';

// jsdom has no WebGL, so the 3D view is stubbed.
vi.mock('@/engine/lesson/ModelViewport', () => ({ default: () => null }));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe('app routes', () => {
  it('renders the module map at the root with the global nav', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: 'Module map' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const name of ['Map', 'Glossary', 'Review']) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument();
    }
  });

  it('shows only EM Fundamentals as open on the map', () => {
    renderAt('/');

    expect(screen.getByRole('link', { name: /EM Fundamentals/ })).toBeInTheDocument();
    expect(screen.getAllByText('Coming later')).toHaveLength(5);
  });

  it('renders a lesson from content, starting at Look', () => {
    renderAt('/module/em-fundamentals/lesson/what-magnets-do');

    expect(screen.getByRole('heading', { level: 1, name: 'What magnets do' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Step 1 of 5: Look' })).toBeInTheDocument();
  });

  it('renders the not-found page for an unknown path, module or lesson', () => {
    for (const path of ['/no-such-page', '/module/astronomy', '/module/em-fundamentals/lesson/x']) {
      const { unmount } = render(
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />,
      );
      expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
      unmount();
    }
  });
});
