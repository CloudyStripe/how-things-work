import { Link } from 'react-router';

// Placeholder until the engine shell builds the module map from content/map.ts.
export function MapPage() {
  return (
    <section className="page">
      <h1>Module map</h1>
      <p className="page-note">Placeholder. Modules and their prerequisites will appear here.</p>
      <p>
        <Link to="/module/em-fundamentals">Open EM Fundamentals</Link>
      </p>
    </section>
  );
}
