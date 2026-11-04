import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { findModule, moduleMap, moduleTerms } from '@/engine/content';
import type { Module } from '@/engine/content/schema';
import { lessonStatus, statusLabel, unfinishedPrerequisites } from '@/engine/lesson/flow';
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
  const lessons = useProgressStore((state) => state.lessons);
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

      <h2>Lessons</h2>
      <ol className="lesson-list" aria-label="Lessons">
        {module.lessons.map((lesson) => (
          <li key={lesson.id} className="lesson-list-item">
            <Link to={`/module/${module.id}/lesson/${lesson.id}`}>{lesson.title}</Link>
            <span className="lesson-list-status">
              {statusLabel(lessonStatus(lesson, lessons[lesson.id]))}
            </span>
          </li>
        ))}
        {(module.comingLater ?? []).map((title) => (
          <li key={title} className="lesson-list-item is-coming-later">
            <span>{title}</span>
            <span className="lesson-list-status">Coming later</span>
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
  const lessons = useProgressStore((state) => state.lessons);
  const unfinished = unfinishedPrerequisites(module, findModule, lessons);
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
  const resetLessons = useProgressStore((state) => state.resetLessons);

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
    <div className="module-reset confirm-box" role="group" aria-label="Confirm reset">
      <p>
        This clears your steps, predictions, challenges, terms met and review cards for{' '}
        {module.title}. It cannot be undone.
      </p>
      <button
        type="button"
        className="button"
        onClick={() => {
          resetLessons(module.lessons.map((lesson) => lesson.id));
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
