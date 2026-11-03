import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { findModule, moduleMap, moduleTerms } from '@/engine/content';
import type { Module } from '@/engine/content/schema';
import { experimentStatus, statusLabel, unfinishedPrerequisites } from '@/engine/experiment/flow';
import { useProgressStore } from '@/engine/progress/store';
import { Term } from '@/glossary/Term';
import { TermText } from '@/glossary/TermText';
import { NotFoundPage } from './NotFoundPage';

export function ModulePage() {
  const { moduleId = '' } = useParams();
  const module = findModule(moduleId);
  if (module === undefined) return <NotFoundPage />;
  return <ModuleView module={module} />;
}

function ModuleView({ module }: { module: Module }) {
  const experiments = useProgressStore((state) => state.experiments);
  const terms = moduleTerms(module);

  return (
    <section className="page module-page">
      <h1>{module.title}</h1>
      <p className="module-hook">
        <TermText text={module.hook} />
      </p>
      <PrerequisiteNudges module={module} />

      <h2>History</h2>
      <ul className="module-history">
        {module.history.map((line) => (
          <li key={line}>
            <TermText text={line} />
          </li>
        ))}
      </ul>

      <h2>Experiments</h2>
      <ol className="experiment-list">
        {module.experiments.map((experiment) => (
          <li key={experiment.id} className="experiment-list-item">
            <Link to={`/module/${module.id}/experiment/${experiment.id}`}>{experiment.title}</Link>
            <span className="experiment-list-status">
              {statusLabel(experimentStatus(experiment, experiments[experiment.id]))}
            </span>
          </li>
        ))}
      </ol>

      {terms.length > 0 && (
        <>
          <h2>Terms</h2>
          <ul className="term-list">
            {terms.map((term) => (
              <li key={term.id}>
                <Term termId={term.id}>{term.name}</Term>
              </li>
            ))}
          </ul>
        </>
      )}

      <ResetModule module={module} />
    </section>
  );
}

/** One line per unfinished prerequisite. It never blocks the module. */
function PrerequisiteNudges({ module }: { module: Module }) {
  const experiments = useProgressStore((state) => state.experiments);
  const unfinished = unfinishedPrerequisites(module, findModule, experiments);
  if (unfinished.length === 0) return null;

  return (
    <ul className="module-nudges">
      {unfinished.map((prerequisiteId) => {
        const title =
          moduleMap.nodes.find((node) => node.moduleId === prerequisiteId)?.title ?? prerequisiteId;
        return (
          <li key={prerequisiteId}>
            This module builds on {title}, which you have not finished yet. You can still go ahead.
          </li>
        );
      })}
    </ul>
  );
}

function ResetModule({ module }: { module: Module }) {
  const [confirming, setConfirming] = useState(false);
  const resetExperiments = useProgressStore((state) => state.resetExperiments);

  if (!confirming) {
    return (
      <p className="module-reset">
        <button type="button" className="button-quiet" onClick={() => setConfirming(true)}>
          Reset progress for this module
        </button>
      </p>
    );
  }

  return (
    <div className="module-reset" role="group" aria-label="Confirm reset">
      <p>
        This clears your steps, predictions, challenges, terms met and review cards for{' '}
        {module.title}. It cannot be undone.
      </p>
      <button
        type="button"
        className="button"
        onClick={() => {
          resetExperiments(module.experiments.map((experiment) => experiment.id));
          setConfirming(false);
        }}
      >
        Reset
      </button>{' '}
      <button type="button" className="button-quiet" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </div>
  );
}
