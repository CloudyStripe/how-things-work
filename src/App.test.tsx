import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './routes';

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

  it('renders an experiment route with its params', () => {
    renderAt('/module/em-fundamentals/experiment/exp1-current-makes-field');

    expect(screen.getByRole('heading', { level: 1, name: 'Experiment' })).toBeInTheDocument();
    expect(screen.getByText('exp1-current-makes-field')).toBeInTheDocument();
  });

  it('renders the not-found page for an unknown path', () => {
    renderAt('/no-such-page');

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
