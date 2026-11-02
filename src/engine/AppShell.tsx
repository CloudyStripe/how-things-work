import { Link, NavLink, Outlet } from 'react-router';

// Glossary and Review are global pages, reachable from every screen.
const NAV_ITEMS = [
  { to: '/', label: 'Map', end: true },
  { to: '/glossary', label: 'Glossary', end: false },
  { to: '/review', label: 'Review', end: false },
];

export function AppShell() {
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
