import { describe, expect, it } from 'vitest';
import { emFundamentals } from '@content/modules/em-fundamentals/module';
import { placeholderExperiment } from '@content/modules/em-fundamentals/placeholder-experiment';
import type { Module } from '@/engine/content/schema';
import type { ExperimentProgress } from '@/engine/progress/store';
import {
  canLeaveStep,
  experimentStatus,
  isModuleComplete,
  statusLabel,
  stepSequence,
  unfinishedPrerequisites,
} from './flow';

const AT = '2026-11-02T12:00:00.000Z';

function progress(change: Partial<ExperimentProgress> = {}): ExperimentProgress {
  return { step: 'hook', completedSteps: [], startedAt: AT, updatedAt: AT, ...change };
}

describe('experiment flow', () => {
  it('runs all eight steps, or seven without a Pattern', () => {
    expect(stepSequence(placeholderExperiment)).toEqual([
      'hook',
      'predict',
      'explore',
      'reveal',
      'pattern',
      'world',
      'challenge',
      'recall',
    ]);
    const steps = { ...placeholderExperiment.steps, pattern: undefined };
    expect(stepSequence({ ...placeholderExperiment, steps })).not.toContain('pattern');
    expect(stepSequence({ ...placeholderExperiment, steps })).toHaveLength(7);
  });

  it('holds the learner at Predict until a prediction is committed, and nowhere else', () => {
    expect(canLeaveStep('predict', progress())).toBe(false);
    expect(
      canLeaveStep('predict', progress({ prediction: { choice: 'turn', correct: true, at: AT } })),
    ).toBe(true);
    expect(canLeaveStep('explore', progress())).toBe(true);
    expect(canLeaveStep('challenge', progress())).toBe(true);
  });

  it('reports where the learner is', () => {
    expect(statusLabel(experimentStatus(placeholderExperiment, undefined))).toBe('Not started');
    expect(statusLabel(experimentStatus(placeholderExperiment, progress({ step: 'reveal' })))).toBe(
      'Step 4 of 8',
    );
    expect(
      statusLabel(experimentStatus(placeholderExperiment, progress({ completedAt: AT }))),
    ).toBe('Complete');
  });

  it('counts a module complete when every experiment is', () => {
    expect(isModuleComplete(emFundamentals, {})).toBe(false);
    expect(
      isModuleComplete(emFundamentals, {
        [placeholderExperiment.id]: progress({ completedAt: AT }),
      }),
    ).toBe(true);
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
    const done = { [placeholderExperiment.id]: progress({ completedAt: AT }) };
    expect(unfinishedPrerequisites(magnetism, find, done)).toEqual(['not-built-yet']);
    expect(unfinishedPrerequisites(emFundamentals, find, {})).toEqual([]);
  });
});
