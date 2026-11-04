import { Link, NavLink, Outlet } from 'react-router';
import { useProgressStore } from '@/engine/progress/store';
import { isDue } from '@/review/scheduler';
import { useNow } from '@/review/useNow';

// Glossary, Review and Progress are global pages, reachable from every screen.
const NAV_ITEMS = [
  { to: '/', label: 'Map', end: true },
  { to: '/glossary', label: 'Glossary', end: false },
  { to: '/review', label: 'Review', end: false },
  { to: '/progress', label: 'Progress', end: false },
];

export function AppShell() {
  const queue = useProgressStore((state) => state.reviewQueue);
  const now = useNow();
  const due = queue.filter((card) => isDue(card, now)).length;

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-title">
          How Things Work
        </Link>
        <nav aria-label="Main">
          <ul className="app-nav">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className="app-nav-link">
                  {item.label}
                  {/* Cards due for review, counted on every screen, the map included. */}
                  {item.to === '/review' && due > 0 && (
                    <span className="nav-badge" aria-label={`${due} due`}>
                      {due}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
