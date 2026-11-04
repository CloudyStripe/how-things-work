import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Lesson, Module, StepKind } from '@/engine/content/schema';
import { useProgressStore, type LessonProgress } from '@/engine/progress/store';
import { useSimStore } from '@/engine/sim/store';
import { useSimLoop } from '@/engine/sim/useSimLoop';
import { controlValueLabel, type AnyModel, type ControlSpec } from '@/models/types';
import { canLeaveStep, isInteractive, stepSequence } from './flow';

/** One row of the Pattern table: a setting of the varied control and the reading it gave. */
export interface PatternRow {
  readonly value: string;
  readonly label: string;
  /** In the reading's display units. */
  readonly reading: number;
}

export interface LessonRunner {
  readonly step: StepKind;
  readonly stepIndex: number;
  readonly sequence: readonly StepKind[];
  readonly progress: LessonProgress | undefined;
  /** Whether the learner can work the model right now. */
  readonly interactive: boolean;
  readonly promptsDone: readonly boolean[];
  readonly patternRows: readonly PatternRow[];
  readonly canAdvance: boolean;
  readonly isLastStep: boolean;
  next(): void;
  back(): void;
  commitPrediction(choiceId: string): void;
}

/**
 * Runs one lesson: where the learner is in its steps, the simulation behind the model, and the
 * checks made every frame (prompts ticking off, the challenge, Pattern rows).
 */
export function useLessonRunner(module: Module, lesson: Lesson, model: AnyModel): LessonRunner {
  const navigate = useNavigate();
  const progress = useProgressStore((state) => state.lessons[lesson.id]);
  const sequence = useMemo(() => stepSequence(lesson), [lesson]);
  const step = progress?.step ?? 'look';
  const stepIndex = Math.max(0, sequence.indexOf(step));
  const interactive = isInteractive(lesson, step, progress);
  const { prompts } = lesson.steps.try;
  const why = lesson.steps.why;
  const pattern = lesson.kind === 'model' ? lesson.steps.pattern : undefined;
  const challenge = lesson.kind === 'model' ? lesson.steps.challenge : undefined;

  const [promptsDone, setPromptsDone] = useState<readonly boolean[]>(() =>
    prompts.map(() => false),
  );
  const [patternRows, setPatternRows] = useState<readonly PatternRow[]>([]);

  useEffect(() => {
    useProgressStore.getState().startLesson(lesson.id);
    useSimStore.getState().load(model);
  }, [lesson.id, model]);

  // Entering a step: Why records its terms and turns on its overlay, and Challenge puts the
  // model back as it started, so nothing left over from Try can solve it.
  useEffect(() => {
    if (step === 'why' && why !== undefined) {
      useProgressStore.getState().encounterTerms(lesson.id, why.names);
      if (why.overlay !== undefined) useSimStore.getState().setOverlay(why.overlay, true);
    }
    if (step === 'challenge') useSimStore.getState().reset();
  }, [step, lesson.id, why]);

  useSimLoop((snapshot, view) => {
    if (step === 'try' && interactive) {
      const newlyDone = prompts.map(
        (prompt, index) => !promptsDone[index] && prompt.doneWhen?.(snapshot, view) === true,
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
      challenge !== undefined &&
      progress?.challengeCompletedAt === undefined &&
      challenge.isMet(snapshot, view)
    ) {
      useProgressStore.getState().completeChallenge(lesson.id);
    }
  });

  const canAdvance = canLeaveStep(lesson, step, progress);
  const isLastStep = stepIndex === sequence.length - 1;

  return {
    step,
    stepIndex,
    sequence,
    progress,
    interactive,
    promptsDone,
    patternRows,
    canAdvance,
    isLastStep,

    next() {
      if (!canAdvance) return;
      const store = useProgressStore.getState();
      store.completeStep(lesson.id, step);
      const following = sequence[stepIndex + 1];
      if (following === undefined) {
        // Finishing queues the review cards quietly (there is no Recall screen): its recall cards,
        store.completeLesson(lesson.id);
        // with two cards for each term its Why named.
        store.addReviewCards(
          lesson.id,
          (lesson.recall ?? []).map((card) => card.id),
          lesson.steps.why?.names ?? [],
        );
        void navigate(`/module/${module.id}`);
        return;
      }
      store.goToStep(lesson.id, following);
    },

    back() {
      const previous = sequence[stepIndex - 1];
      if (previous !== undefined) useProgressStore.getState().goToStep(lesson.id, previous);
    },

    commitPrediction(choiceId) {
      const answer = lesson.steps.try.predict?.answer;
      if (answer === undefined) return;
      useProgressStore.getState().savePrediction(lesson.id, choiceId, choiceId === answer);
    },
  };
}

/** Rows follow the control's own order (Low, Medium, High), not the order they were logged. */
function sortRows(rows: PatternRow[], spec: ControlSpec): PatternRow[] {
  const order = (row: PatternRow) => {
    if (spec.kind === 'choice')
      return spec.options.findIndex((option) => option.value === row.value);
    if (spec.kind === 'slider') return Number(row.value);
    if (spec.kind === 'spot') return 0;
    return Number(row.value === 'true');
  };
  return rows.sort((a, b) => order(a) - order(b));
}
