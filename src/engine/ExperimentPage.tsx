import { Link, useParams } from 'react-router';

// Placeholder until the experiment runner renders the eight-step flow from a content file.
export function ExperimentPage() {
  const { moduleId, experimentId } = useParams();

  return (
    <section className="page">
      <h1>Experiment</h1>
      <p className="page-note">
        Placeholder for experiment <code>{experimentId}</code> in module <code>{moduleId}</code>.
      </p>
      <p>
        <Link to={`/module/${moduleId}`}>Back to the module</Link>
      </p>
    </section>
  );
}
