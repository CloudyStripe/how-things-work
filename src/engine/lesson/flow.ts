import { STEP_KINDS, type Lesson, type Module, type StepKind } from '@/engine/content/schema';
import type { LessonProgress } from '@/engine/progress/store';

// The rules of the lesson flow, kept apart from the screens so they can be tested alone.

export const STEP_TITLES: Readonly<Record<StepKind, string>> = {
  look: 'Look',
  try: 'Try',
  why: 'Why',
  pattern: 'Pattern',
  world: 'In the world',
  challenge: 'Challenge',
};

/** The steps this lesson runs, in order: Look and Try, then whichever others it has. */
export function stepSequence(lesson: Lesson): StepKind[] {
  const steps: Partial<Record<StepKind, unknown>> = lesson.steps;
  return STEP_KINDS.filter((step) => steps[step] !== undefined);
}

/** True until the learner answers the lesson's prediction, if it has one. */
export function isPredictionPending(lesson: Lesson, progress: LessonProgress | undefined): boolean {
  return lesson.steps.try.predict !== undefined && progress?.prediction === undefined;
}

/**
 * Whether the learner can work the model: not during Look, which is for looking, and not while
 * a prediction is waiting for an answer.
 */
export function isInteractive(
  lesson: Lesson,
  step: StepKind,
  progress: LessonProgress | undefined,
): boolean {
  return step !== 'look' && !isPredictionPending(lesson, progress);
}

/** Only an unanswered prediction holds the learner back: Next waits for it. */
export function canLeaveStep(
  lesson: Lesson,
  step: StepKind,
  progress: LessonProgress | undefined,
): boolean {
  return step !== 'try' || !isPredictionPending(lesson, progress);
}

export type LessonStatus =
  | { readonly kind: 'not-started' }
  | { readonly kind: 'in-progress'; readonly stepNumber: number; readonly stepCount: number }
  | { readonly kind: 'complete' };

export function lessonStatus(lesson: Lesson, progress: LessonProgress | undefined): LessonStatus {
  if (progress === undefined) return { kind: 'not-started' };
  if (progress.completedAt !== undefined) return { kind: 'complete' };
  const sequence = stepSequence(lesson);
  return {
    kind: 'in-progress',
    stepNumber: Math.max(1, sequence.indexOf(progress.step) + 1),
    stepCount: sequence.length,
  };
}

export function statusLabel(status: LessonStatus): string {
  switch (status.kind) {
    case 'not-started':
      return 'Not started';
    case 'in-progress':
      return `Step ${status.stepNumber} of ${status.stepCount}`;
    case 'complete':
      return 'Complete';
  }
}

/** A module is complete when every one of its lessons is. */
export function isModuleComplete(
  module: Module,
  lessons: Readonly<Record<string, LessonProgress>>,
): boolean {
  return module.lessons.every((lesson) => lessons[lesson.id]?.completedAt !== undefined);
}

/**
 * The prerequisites of a module that are not finished: not built yet, or built but not
 * complete. Each gets a one-line nudge; none of them blocks the module.
 */
export function unfinishedPrerequisites(
  module: Module,
  findModule: (moduleId: string) => Module | undefined,
  lessons: Readonly<Record<string, LessonProgress>>,
): string[] {
  return module.prerequisites.filter((prerequisiteId) => {
    const prerequisite = findModule(prerequisiteId);
    return prerequisite === undefined || !isModuleComplete(prerequisite, lessons);
  });
}

export function isModuleStarted(
  module: Module,
  lessons: Readonly<Record<string, LessonProgress>>,
): boolean {
  return module.lessons.some((lesson) => lessons[lesson.id] !== undefined);
}
