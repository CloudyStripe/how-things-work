import { STEP_KINDS, type Experiment, type Module, type StepKind } from '@/engine/content/schema';
import type { ExperimentProgress } from '@/engine/progress/store';

// The rules of the eight-step flow, kept apart from the screens so they can be tested alone.

export const STEP_TITLES: Readonly<Record<StepKind, string>> = {
  hook: 'Hook',
  predict: 'Predict',
  explore: 'Explore',
  reveal: 'Reveal and name',
  pattern: 'Pattern',
  world: 'In the world',
  challenge: 'Challenge',
  recall: 'Recall',
};

/** The steps this experiment runs, in order: all eight, or seven without a Pattern. */
export function stepSequence(experiment: Experiment): StepKind[] {
  return STEP_KINDS.filter((step) => step !== 'pattern' || experiment.steps.pattern !== undefined);
}

/** The model unlocks once a prediction is committed. */
export function isModelUnlocked(progress: ExperimentProgress | undefined): boolean {
  return progress?.prediction !== undefined;
}

/** Only Predict holds the learner back: Next waits for a committed prediction. */
export function canLeaveStep(step: StepKind, progress: ExperimentProgress | undefined): boolean {
  return step !== 'predict' || isModelUnlocked(progress);
}

export type ExperimentStatus =
  | { readonly kind: 'not-started' }
  | { readonly kind: 'in-progress'; readonly stepNumber: number; readonly stepCount: number }
  | { readonly kind: 'complete' };

export function experimentStatus(
  experiment: Experiment,
  progress: ExperimentProgress | undefined,
): ExperimentStatus {
  if (progress === undefined) return { kind: 'not-started' };
  if (progress.completedAt !== undefined) return { kind: 'complete' };
  const sequence = stepSequence(experiment);
  return {
    kind: 'in-progress',
    stepNumber: Math.max(1, sequence.indexOf(progress.step) + 1),
    stepCount: sequence.length,
  };
}

export function statusLabel(status: ExperimentStatus): string {
  switch (status.kind) {
    case 'not-started':
      return 'Not started';
    case 'in-progress':
      return `Step ${status.stepNumber} of ${status.stepCount}`;
    case 'complete':
      return 'Complete';
  }
}

/** A module is complete when every one of its experiments is. */
export function isModuleComplete(
  module: Module,
  experiments: Readonly<Record<string, ExperimentProgress>>,
): boolean {
  return module.experiments.every(
    (experiment) => experiments[experiment.id]?.completedAt !== undefined,
  );
}

/**
 * The prerequisites of a module that are not finished: not built yet, or built but not
 * complete. Each gets a one-line nudge; none of them blocks the module.
 */
export function unfinishedPrerequisites(
  module: Module,
  findModule: (moduleId: string) => Module | undefined,
  experiments: Readonly<Record<string, ExperimentProgress>>,
): string[] {
  return module.prerequisites.filter((prerequisiteId) => {
    const prerequisite = findModule(prerequisiteId);
    return prerequisite === undefined || !isModuleComplete(prerequisite, experiments);
  });
}

export function isModuleStarted(
  module: Module,
  experiments: Readonly<Record<string, ExperimentProgress>>,
): boolean {
  return module.experiments.some((experiment) => experiments[experiment.id] !== undefined);
}
