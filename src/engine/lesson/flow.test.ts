import { describe, expect, it } from 'vitest';
import { theWindmill } from '@content/modules/em-fundamentals/01-the-windmill';
import { whatMagnetsDo } from '@content/modules/em-fundamentals/02-what-magnets-do';
import { emFundamentals } from '@content/modules/em-fundamentals/module';
import type { Module, ModelLesson } from '@/engine/content/schema';
import type { LessonProgress } from '@/engine/progress/store';
import {
  canLeaveStep,
  isInteractive,
  isModuleComplete,
  lessonStatus,
  statusLabel,
  stepSequence,
  unfinishedPrerequisites,
} from './flow';

const AT = '2026-11-03T12:00:00.000Z';

function progress(change: Partial<LessonProgress> = {}): LessonProgress {
  return { step: 'look', completedSteps: [], startedAt: AT, updatedAt: AT, ...change };
}

const ANSWERED = progress({ step: 'try', prediction: { choice: 'away', correct: true, at: AT } });

/** Lesson 2 without its prediction, as a lesson that has none. */
const NO_PREDICTION: ModelLesson = {
  ...whatMagnetsDo,
  steps: { ...whatMagnetsDo.steps, try: { prompts: whatMagnetsDo.steps.try.prompts } },
};

describe('lesson flow', () => {
  it('always runs Look, Try and Why, then only the optional steps a lesson has', () => {
    expect(stepSequence(whatMagnetsDo)).toEqual(['look', 'try', 'why', 'world', 'challenge']);
    const bare = {
      ...whatMagnetsDo,
      steps: { ...whatMagnetsDo.steps, world: undefined, challenge: undefined },
    };
    expect(stepSequence(bare)).toEqual(['look', 'try', 'why']);
  });

  it('runs an explorer as Look and Try, plus Why when it has one', () => {
    expect(stepSequence(theWindmill)).toEqual(['look', 'try', 'why']);
    const noWhy = { ...theWindmill, steps: { ...theWindmill.steps, why: undefined } };
    expect(stepSequence(noWhy)).toEqual(['look', 'try']);
  });

  it('keeps the model still during Look, for looking', () => {
    expect(isInteractive(whatMagnetsDo, 'look', progress())).toBe(false);
    expect(isInteractive(NO_PREDICTION, 'look', progress())).toBe(false);
    expect(isInteractive(theWindmill, 'look', progress())).toBe(false);
  });

  it('unlocks the model in Try once the prediction is answered, or at once without one', () => {
    expect(isInteractive(whatMagnetsDo, 'try', progress({ step: 'try' }))).toBe(false);
    expect(isInteractive(whatMagnetsDo, 'try', ANSWERED)).toBe(true);
    expect(isInteractive(NO_PREDICTION, 'try', progress({ step: 'try' }))).toBe(true);
    expect(isInteractive(whatMagnetsDo, 'challenge', ANSWERED)).toBe(true);
  });

  it('holds the learner in Try only while a prediction is unanswered', () => {
    expect(canLeaveStep(whatMagnetsDo, 'try', progress({ step: 'try' }))).toBe(false);
    expect(canLeaveStep(whatMagnetsDo, 'try', ANSWERED)).toBe(true);
    expect(canLeaveStep(NO_PREDICTION, 'try', progress({ step: 'try' }))).toBe(true);
    expect(canLeaveStep(whatMagnetsDo, 'look', progress())).toBe(true);
    expect(canLeaveStep(whatMagnetsDo, 'challenge', ANSWERED)).toBe(true);
  });

  it('reports where the learner is', () => {
    expect(statusLabel(lessonStatus(whatMagnetsDo, undefined))).toBe('Not started');
    expect(statusLabel(lessonStatus(whatMagnetsDo, progress({ step: 'why' })))).toBe('Step 3 of 5');
    expect(statusLabel(lessonStatus(whatMagnetsDo, progress({ completedAt: AT })))).toBe(
      'Complete',
    );
  });

  it('counts a module complete when every lesson is', () => {
    const done = progress({ completedAt: AT });
    expect(isModuleComplete(emFundamentals, {})).toBe(false);
    expect(isModuleComplete(emFundamentals, { [whatMagnetsDo.id]: done })).toBe(false);
    expect(isModuleComplete(emFundamentals, everyLesson(done))).toBe(true);
  });

  it('nudges about unfinished prerequisites without blocking', () => {
    const magnetism: Module = {
      ...emFundamentals,
      id: 'magnetism',
      title: 'Magnetism',
      prerequisites: ['em-fundamentals', 'not-built-yet'],
    };
    const find = (id: string) => (id === emFundamentals.id ? emFundamentals : undefined);

    expect(unfinishedPrerequisites(magnetism, find, {})).toEqual([
      'em-fundamentals',
      'not-built-yet',
    ]);
    const done = progress({ completedAt: AT });
    expect(unfinishedPrerequisites(magnetism, find, everyLesson(done))).toEqual(['not-built-yet']);
    expect(unfinishedPrerequisites(emFundamentals, find, {})).toEqual([]);
  });
});

/** The same progress for every lesson in EM Fundamentals. */
function everyLesson(lesson: LessonProgress): Record<string, LessonProgress> {
  return Object.fromEntries(emFundamentals.lessons.map(({ id }) => [id, lesson]));
}
