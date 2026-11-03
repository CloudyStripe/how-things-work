import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Experiment, Module, StepKind } from '@/engine/content/schema';
import { useProgressStore, type ExperimentProgress } from '@/engine/progress/store';
import { useSimStore } from '@/engine/sim/store';
import { useSimLoop } from '@/engine/sim/useSimLoop';
import { controlValueLabel, type AnyModel, type ControlSpec } from '@/models/types';
import { canLeaveStep, isModelUnlocked, stepSequence } from './flow';

/** One row of the Pattern table: a setting of the varied control and the reading it gave. */
export interface PatternRow {
  readonly value: string;
  readonly label: string;
  /** In the reading's display units. */
  readonly reading: number;
}

export interface ExperimentRunner {
  readonly step: StepKind;
  readonly stepIndex: number;
  readonly sequence: readonly StepKind[];
  readonly progress: ExperimentProgress | undefined;
  readonly unlocked: boolean;
  readonly promptsDone: readonly boolean[];
  readonly patternRows: readonly PatternRow[];
  readonly canAdvance: boolean;
  readonly isLastStep: boolean;
  next(): void;
  back(): void;
  commitPrediction(choiceId: string): void;
}

/**
 * Runs one experiment: where the learner is in the eight steps, the simulation behind the
 * model, and the checks made every frame (prompts ticking off, the challenge, Pattern rows).
 */
export function useExperimentRunner(
  module: Module,
  experiment: Experiment,
  model: AnyModel,
): ExperimentRunner {
  const navigate = useNavigate();
  const progress = useProgressStore((state) => state.experiments[experiment.id]);
  const sequence = useMemo(() => stepSequence(experiment), [experiment]);
  const step = progress?.step ?? 'hook';
  const stepIndex = Math.max(0, sequence.indexOf(step));
  const { explore, reveal, pattern, challenge, recall } = experiment.steps;

  const [promptsDone, setPromptsDone] = useState<readonly boolean[]>(() =>
    explore.prompts.map(() => false),
  );
  const [patternRows, setPatternRows] = useState<readonly PatternRow[]>([]);

  useEffect(() => {
    useProgressStore.getState().startExperiment(experiment.id);
    useSimStore.getState().load(model);
  }, [experiment.id, model]);

  // Entering a step: Reveal records its terms and turns on its overlay, and Recall queues its
  // cards.
  useEffect(() => {
    const store = useProgressStore.getState();
    if (step === 'reveal') {
      store.encounterTerms(experiment.id, reveal.names);
      if (reveal.overlay !== undefined) useSimStore.getState().setOverlay(reveal.overlay, true);
    }
    if (step === 'recall') {
      store.addReviewCards(
        experiment.id,
        recall.cards.map((card) => card.id),
      );
    }
  }, [step, experiment.id, reveal, recall]);

  useSimLoop((snapshot) => {
    if (step === 'explore') {
      const newlyDone = explore.prompts.map(
        (prompt, index) => !promptsDone[index] && prompt.doneWhen?.(snapshot) === true,
      );
      if (newlyDone.some(Boolean)) {
        setPromptsDone((done) => done.map((value, index) => value || newlyDone[index] === true));
      }
    }

    // The row for the current setting stays live (closing a switch updates it); moving the
    // varied control to another setting leaves it as logged.
    if (step === 'pattern' && pattern !== undefined) {
      const value = snapshot.controls[pattern.control];
      const spec = model.controls[pattern.control];
      const reading = model.readings[pattern.reading];
      if (spec !== undefined && reading !== undefined) {
        const row = {
          value: String(value),
          label: controlValueLabel(spec, value),
          reading: reading.read(snapshot) * reading.scale,
        };
        const logged = patternRows.find((existing) => existing.value === row.value);
        if (logged?.reading !== row.reading) {
          setPatternRows((rows) =>
            sortRows([...rows.filter((existing) => existing.value !== row.value), row], spec),
          );
        }
      }
    }

    if (
      step === 'challenge' &&
      progress?.challengeCompletedAt === undefined &&
      challenge.isMet(snapshot)
    ) {
      useProgressStore.getState().completeChallenge(experiment.id);
    }
  });

  const canAdvance = canLeaveStep(step, progress);
  const isLastStep = stepIndex === sequence.length - 1;

  return {
    step,
    stepIndex,
    sequence,
    progress,
    unlocked: isModelUnlocked(progress),
    promptsDone,
    patternRows,
    canAdvance,
    isLastStep,

    next() {
      if (!canAdvance) return;
      const store = useProgressStore.getState();
      store.completeStep(experiment.id, step);
      const following = sequence[stepIndex + 1];
      if (following === undefined) {
        store.completeExperiment(experiment.id);
        void navigate(`/module/${module.id}`);
        return;
      }
      store.goToStep(experiment.id, following);
    },

    back() {
      const previous = sequence[stepIndex - 1];
      if (previous !== undefined) useProgressStore.getState().goToStep(experiment.id, previous);
    },

    commitPrediction(choiceId) {
      const correct = choiceId === experiment.steps.predict.answer;
      useProgressStore.getState().savePrediction(experiment.id, choiceId, correct);
    },
  };
}

/** Rows follow the control's own order (Low, Medium, High), not the order they were logged. */
function sortRows(rows: PatternRow[], spec: ControlSpec): PatternRow[] {
  const order = (row: PatternRow) =>
    spec.kind === 'choice'
      ? spec.options.findIndex((option) => option.value === row.value)
      : Number(row.value === 'true');
  return rows.sort((a, b) => order(a) - order(b));
}
