import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { routes } from './routes';

// jsdom has no WebGL, so the 3D view is stubbed.
vi.mock('@/engine/experiment/ModelViewport', () => ({ default: () => null }));

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

  it('renders a module and an experiment from content', () => {
    renderAt('/module/em-fundamentals/experiment/placeholder-wire-compass');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Placeholder: a wire and a compass' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Step 1 of 8: Hook' })).toBeInTheDocument();
  });

  it('renders the not-found page for an unknown path, module or experiment', () => {
    for (const path of [
      '/no-such-page',
      '/module/astronomy',
      '/module/em-fundamentals/experiment/x',
    ]) {
      const { unmount } = render(
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />,
      );
      expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
      unmount();
    }
  });
});
