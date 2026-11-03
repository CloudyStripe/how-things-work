import { useState } from 'react';
import { Link } from 'react-router';
import { findTerm, moduleMap } from '@/engine/content';
import type { Experiment, Module } from '@/engine/content/schema';
import { Term } from '@/glossary/Term';
import { TermText } from '@/glossary/TermText';
import { STEP_TITLES } from './flow';
import type { ExperimentRunner } from './useExperimentRunner';

interface StepProps {
  readonly experiment: Experiment;
  readonly runner: ExperimentRunner;
}

/** The left panel: which step the learner is on, that step's content, and Back and Next. */
export function StepPanel({ module, experiment, runner }: StepProps & { module: Module }) {
  const { step, stepIndex, sequence } = runner;

  return (
    <aside className="experiment-lesson" aria-label="Lesson">
      <p className="experiment-module">
        <Link to={`/module/${module.id}`}>{module.title}</Link>
      </p>
      <h1 className="experiment-title">{experiment.title}</h1>
      <h2 className="step-heading">
        Step {stepIndex + 1} of {sequence.length}: {STEP_TITLES[step]}
      </h2>
      <div className="step-body">
        <StepView experiment={experiment} runner={runner} />
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

function StepView({ experiment, runner }: StepProps) {
  switch (runner.step) {
    case 'hook':
      return (
        <p>
          <TermText text={experiment.steps.hook.text} />
        </p>
      );
    case 'predict':
      return <PredictStep experiment={experiment} runner={runner} />;
    case 'explore':
      return <ExploreStep experiment={experiment} runner={runner} />;
    case 'reveal':
      return <RevealStep experiment={experiment} runner={runner} />;
    case 'pattern':
      return <PatternStep experiment={experiment} runner={runner} />;
    case 'world':
      return <WorldStep experiment={experiment} />;
    case 'challenge':
      return <ChallengeStep experiment={experiment} runner={runner} />;
    case 'recall':
      return <RecallStep experiment={experiment} />;
  }
}

function PredictStep({ experiment, runner }: StepProps) {
  const { question, choices } = experiment.steps.predict;
  const committed = runner.progress?.prediction;
  const [choice, setChoice] = useState<string | null>(committed?.choice ?? null);

  return (
    <>
      <fieldset className="prediction" disabled={committed !== undefined}>
        <legend>
          <TermText text={question} />
        </legend>
        {choices.map((option) => (
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
          <p className="step-note">Commit to an answer to unlock the model.</p>
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
          Prediction saved. The model is unlocked: press Next to explore it.
        </p>
      )}
    </>
  );
}

function ExploreStep({ experiment, runner }: StepProps) {
  return (
    <>
      <p>Try these in any order. You can also explore freely.</p>
      <ul className="prompts">
        {experiment.steps.explore.prompts.map((prompt, index) => {
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
  );
}

function RevealStep({ experiment, runner }: StepProps) {
  const { predict, reveal } = experiment.steps;
  const prediction = runner.progress?.prediction;
  const chosen = predict.choices.find((choice) => choice.id === prediction?.choice);

  return (
    <>
      {chosen !== undefined && (
        <p className="reveal-prediction">
          You predicted: <strong>{chosen.label}</strong>.{' '}
          {prediction?.correct === true
            ? 'That matches what happened.'
            : 'What happened was different.'}
        </p>
      )}
      <p>
        <TermText text={reveal.observation} />
      </p>
      <p>
        <TermText text={reveal.explanation} naming={reveal.names} />
      </p>
      <p className="reveal-terms">
        Named here:{' '}
        {reveal.names.map((termId, index) => (
          <span key={termId}>
            {index > 0 && ', '}
            <Term termId={termId} named>
              {findTerm(termId)?.name ?? termId}
            </Term>
          </span>
        ))}
      </p>
    </>
  );
}

function PatternStep({ experiment, runner }: StepProps) {
  const { pattern } = experiment.steps;
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

function WorldStep({ experiment }: { experiment: Experiment }) {
  return (
    <ul className="world-items">
      {experiment.steps.world.items.map((item) => {
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

function ChallengeStep({ experiment, runner }: StepProps) {
  const solved = runner.progress?.challengeCompletedAt !== undefined;
  return (
    <>
      <p className="challenge-goal">
        <TermText text={experiment.steps.challenge.goal} />
      </p>
      <p className={solved ? 'challenge-status is-solved' : 'challenge-status'} role="status">
        {solved ? 'Challenge complete.' : 'Not solved yet. Keep adjusting the model.'}
      </p>
    </>
  );
}

const CARD_KINDS = { concept: 'Concept', term: 'Term', prediction: 'Prediction' } as const;

function RecallStep({ experiment }: { experiment: Experiment }) {
  return (
    <>
      <p>These cards are now in your review queue.</p>
      <ul className="recall-cards">
        {experiment.steps.recall.cards.map((card) => (
          <li key={card.id} className="recall-card">
            <p className="recall-kind">{CARD_KINDS[card.kind]}</p>
            <p className="recall-prompt">
              <TermText text={card.prompt} />
            </p>
            <details>
              <summary>Show answer</summary>
              <p>
                <TermText text={card.answer} />
              </p>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
