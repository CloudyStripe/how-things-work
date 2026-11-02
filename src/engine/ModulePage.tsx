import { Link, useParams } from 'react-router';

// Placeholder until the engine shell renders a module from its content file.
export function ModulePage() {
  const { moduleId } = useParams();

  return (
    <section className="page">
      <h1>Module</h1>
      <p className="page-note">
        Placeholder for module <code>{moduleId}</code>. Its intro, experiments and capstone will
        appear here.
      </p>
      <p>
        <Link to={`/module/${moduleId}/experiment/exp1-current-makes-field`}>
          Open Experiment 1
        </Link>
      </p>
    </section>
  );
}
