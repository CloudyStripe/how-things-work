import { useState } from 'react';
import { Link } from 'react-router';
import { findTerm, moduleMap } from '@/engine/content';
import type { Lesson, Module, WhyStep } from '@/engine/content/schema';
import { Term } from '@/glossary/Term';
import { TermText } from '@/glossary/TermText';
import { STEP_TITLES } from './flow';
import type { LessonRunner } from './useLessonRunner';

interface StepProps {
  readonly lesson: Lesson;
  readonly runner: LessonRunner;
}

/** The left panel: which step the learner is on, that step's content, and Back and Next. */
export function StepPanel({ module, lesson, runner }: StepProps & { module: Module }) {
  const { step, stepIndex, sequence } = runner;

  return (
    <aside className="lesson-panel" aria-label="Lesson">
      <p className="lesson-module">
        <Link to={`/module/${module.id}`}>{module.title}</Link>
      </p>
      <h1 className="lesson-title">{lesson.title}</h1>
      <h2 className="step-heading">
        Step {stepIndex + 1} of {sequence.length}: {STEP_TITLES[step]}
      </h2>
      <div className="step-body">
        <StepView lesson={lesson} runner={runner} />
      </div>
      <div className="step-nav">
        <button
          type="button"
          className="button-quiet"
          onClick={runner.back}
          disabled={stepIndex === 0}
        >
          Back
        </button>
        <button
          type="button"
          className="button"
          onClick={runner.next}
          disabled={!runner.canAdvance}
        >
          {runner.isLastStep ? 'Finish' : 'Next'}
        </button>
      </div>
    </aside>
  );
}

function StepView({ lesson, runner }: StepProps) {
  switch (runner.step) {
    case 'look':
      return <LookStep lesson={lesson} />;
    case 'try':
      return <TryStep lesson={lesson} runner={runner} />;
    case 'why':
      return lesson.steps.why === undefined ? null : (
        <WhyView lesson={lesson} why={lesson.steps.why} runner={runner} />
      );
    case 'pattern':
      return lesson.kind === 'model' ? <PatternStep lesson={lesson} runner={runner} /> : null;
    case 'world':
      return lesson.kind === 'model' ? <WorldStep lesson={lesson} /> : null;
    case 'challenge':
      return lesson.kind === 'model' ? <ChallengeStep lesson={lesson} runner={runner} /> : null;
  }
}

function LookStep({ lesson }: { lesson: Lesson }) {
  return (
    <>
      <p>
        <TermText text={lesson.steps.look.text} />
      </p>
      <p className="step-note">
        Turn and zoom the view to look around. Press Next when you are ready to try it.
      </p>
    </>
  );
}

function TryStep({ lesson, runner }: StepProps) {
  const { predict, prompts } = lesson.steps.try;
  const pending = predict !== undefined && runner.progress?.prediction === undefined;

  return (
    <>
      {predict !== undefined && <Prediction predict={predict} runner={runner} />}
      {!pending && (
        <>
          <p>Try these in any order. You can also explore freely.</p>
          <ul className="prompts">
            {prompts.map((prompt, index) => {
              const done = runner.promptsDone[index] === true;
              return (
                <li key={prompt.text} className={done ? 'prompt is-done' : 'prompt'}>
                  <span className="prompt-mark" aria-hidden>
                    {done ? '✓' : ''}
                  </span>
                  <span>
                    <TermText text={prompt.text} />
                    {done && <span className="visually-hidden"> (done)</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

type Predict = NonNullable<Lesson['steps']['try']['predict']>;

function Prediction({ predict, runner }: { predict: Predict; runner: LessonRunner }) {
  const committed = runner.progress?.prediction;
  const [choice, setChoice] = useState<string | null>(committed?.choice ?? null);

  return (
    <>
      <fieldset className="prediction" disabled={committed !== undefined}>
        <legend>
          <TermText text={predict.question} />
        </legend>
        {predict.choices.map((option) => (
          <label key={option.id} className="choice">
            <input
              type="radio"
              name="prediction"
              value={option.id}
              checked={(committed?.choice ?? choice) === option.id}
              onChange={() => setChoice(option.id)}
            />{' '}
            {option.label}
          </label>
        ))}
      </fieldset>
      {committed === undefined ? (
        <>
          <p className="step-note">Answer first, then the controls unlock.</p>
          <button
            type="button"
            className="button"
            disabled={choice === null}
            onClick={() => {
              if (choice !== null) runner.commitPrediction(choice);
            }}
          >
            Commit prediction
          </button>
        </>
      ) : (
        <p className="step-note" role="status">
          Prediction saved. Now try it.
        </p>
      )}
    </>
  );
}

function WhyView({ lesson, why, runner }: StepProps & { why: WhyStep }) {
  const predict = lesson.steps.try.predict;
  const prediction = runner.progress?.prediction;
  const chosen = predict?.choices.find((choice) => choice.id === prediction?.choice);

  return (
    <>
      {chosen !== undefined && (
        <p className="why-prediction">
          You predicted: <strong>{chosen.label}</strong>.{' '}
          {prediction?.correct === true
            ? 'That matches what happened.'
            : 'What happened was different.'}
        </p>
      )}
      {why.observation !== undefined && (
        <p>
          <TermText text={why.observation} />
        </p>
      )}
      <p>
        <TermText text={why.explanation} naming={why.names} />
      </p>
      {why.names.length > 0 && (
        <p className="why-terms">
          Named here:{' '}
          {why.names.map((termId, index) => (
            <span key={termId}>
              {index > 0 && ', '}
              <Term termId={termId} named>
                {findTerm(termId)?.name ?? termId}
              </Term>
            </span>
          ))}
        </p>
      )}
    </>
  );
}

type ModelLessonProps = { readonly lesson: Extract<Lesson, { kind: 'model' }> };

function PatternStep({ lesson, runner }: ModelLessonProps & { runner: LessonRunner }) {
  const { pattern } = lesson.steps;
  if (pattern === undefined) return null;

  return (
    <>
      <p>
        <TermText text={pattern.instruction} />
      </p>
      <p className="step-note">Each new setting adds a reading to the table below.</p>
      {runner.patternRows.length >= 2 && (
        <p className="pattern-statement">
          <strong>Pattern:</strong> <TermText text={pattern.statement} />
        </p>
      )}
    </>
  );
}

function WorldStep({ lesson }: ModelLessonProps) {
  const { world } = lesson.steps;
  if (world === undefined) return null;

  return (
    <ul className="world-items">
      {world.items.map((item) => {
        const node = moduleMap.nodes.find((candidate) => candidate.moduleId === item.module);
        return (
          <li key={item.text}>
            <TermText text={item.text} />
            {node !== undefined && (
              <span className="world-pointer">
                {' '}
                More in {node.title}
                {node.status === 'coming-later' ? ' (coming later)' : ''}.
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ChallengeStep({ lesson, runner }: ModelLessonProps & { runner: LessonRunner }) {
  const { challenge } = lesson.steps;
  if (challenge === undefined) return null;
  const solved = runner.progress?.challengeCompletedAt !== undefined;

  return (
    <>
      <p className="challenge-goal">
        <TermText text={challenge.goal} />
      </p>
      {!solved && <p className="step-note">The model is back as it started.</p>}
      <p className={solved ? 'challenge-status is-solved' : 'challenge-status'} role="status">
        {solved ? 'Challenge complete.' : 'Not solved yet. Keep adjusting the model.'}
      </p>
    </>
  );
}
