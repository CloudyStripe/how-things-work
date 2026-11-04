import { Link } from 'react-router';
import { findTerm, glossary, modules, moduleTerms, termIntroduction } from '@/engine/content';
import type { Term } from '@/engine/content/schema';
import { useProgressStore } from '@/engine/progress/store';
import { TermText } from './TermText';

// The personal glossary: every term the learner has met, by module, each with where it was
// named, and the pairs of terms easily mixed up, side by side.

export function GlossaryPage() {
  const met = useProgressStore((state) => state.terms);
  const groups = modules
    .map((module) => ({ module, terms: moduleTerms(module).filter((term) => term.id in met) }))
    .filter((group) => group.terms.length > 0);
  const pairs = glossary.confusablePairs
    .filter(([first, second]) => first in met && second in met)
    .map((pair) => pair.map(findTerm).filter((term): term is Term => term !== undefined))
    .filter((pair) => pair.length === 2);

  return (
    <section className="page glossary-page">
      <h1>Glossary</h1>
      {groups.length === 0 ? (
        <p className="page-note">
          Terms appear here as you meet them, in the Why step of each lesson.
        </p>
      ) : (
        <p className="page-note">
          The terms you have met, by module. Underlined terms anywhere show their definition when
          you hover over them.
        </p>
      )}

      {groups.map(({ module, terms }) => (
        <section key={module.id} aria-labelledby={`glossary-${module.id}`}>
          <h2 id={`glossary-${module.id}`}>{module.title}</h2>
          <div className="glossary-entries">
            {terms.map((term) => (
              <GlossaryEntry key={term.id} term={term} />
            ))}
          </div>
        </section>
      ))}

      {pairs.length > 0 && (
        <section aria-labelledby="glossary-pairs">
          <h2 id="glossary-pairs">Easily mixed up</h2>
          {pairs.map(([first, second]) =>
            first === undefined || second === undefined ? null : (
              <div key={`${first.id}-${second.id}`} className="glossary-pair">
                {[first, second].map((term) => (
                  <div key={term.id} className="glossary-pair-term">
                    <h3>{capitalize(term.name)}</h3>
                    <p>{term.definition}</p>
                  </div>
                ))}
              </div>
            ),
          )}
        </section>
      )}
    </section>
  );
}

function GlossaryEntry({ term }: { term: Term }) {
  const introduced = termIntroduction(term);
  const related = term.related.map(findTerm).filter((other): other is Term => other !== undefined);
  return (
    <article className="glossary-entry" aria-labelledby={`term-${term.id}`}>
      <h3 id={`term-${term.id}`}>{capitalize(term.name)}</h3>
      <p>{term.definition}</p>
      <p className="glossary-note">
        <TermText text={term.note} />
      </p>
      <p className="glossary-meta">
        {introduced !== undefined && (
          <>
            Named in{' '}
            <Link to={`/module/${introduced.module.id}/lesson/${introduced.lesson.id}`}>
              {introduced.lesson.title}
            </Link>
          </>
        )}
        {related.length > 0 && (
          <>
            {'. Related: '}
            <TermText text={related.map((other) => other.name).join(', ')} />
          </>
        )}
      </p>
    </article>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
