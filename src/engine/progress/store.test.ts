import { beforeEach, describe, expect, it } from 'vitest';
import { clearProgressForTests, PROGRESS_KEY, PROGRESS_VERSION, useProgressStore } from './store';

const progress = () => useProgressStore.getState();

beforeEach(() => {
  clearProgressForTests();
  localStorage.clear();
});

describe('progress actions', () => {
  it('starts an experiment once, at the Hook', () => {
    progress().startExperiment('exp');
    progress().goToStep('exp', 'explore');
    progress().startExperiment('exp');
    expect(progress().experiments.exp?.step).toBe('explore');
  });

  it('records each completed step once', () => {
    progress().startExperiment('exp');
    progress().completeStep('exp', 'hook');
    progress().completeStep('exp', 'hook');
    expect(progress().experiments.exp?.completedSteps).toEqual(['hook']);
  });

  it('keeps the first committed prediction', () => {
    progress().startExperiment('exp');
    progress().savePrediction('exp', 'turn', true);
    progress().savePrediction('exp', 'nothing', false);
    expect(progress().experiments.exp?.prediction).toMatchObject({ choice: 'turn', correct: true });
  });

  it('marks the challenge and the experiment complete once', () => {
    progress().startExperiment('exp');
    progress().completeChallenge('exp');
    const first = progress().experiments.exp?.challengeCompletedAt;
    progress().completeChallenge('exp');
    progress().completeExperiment('exp');
    expect(progress().experiments.exp?.challengeCompletedAt).toBe(first);
    expect(progress().experiments.exp?.completedAt).toBeDefined();
  });

  it('remembers where each term was first met', () => {
    progress().encounterTerms('exp-1', ['magnetic-field']);
    progress().encounterTerms('exp-2', ['magnetic-field', 'solenoid']);
    expect(progress().terms['magnetic-field']?.experimentId).toBe('exp-1');
    expect(progress().terms.solenoid?.experimentId).toBe('exp-2');
  });

  it('queues each recall card once', () => {
    progress().addReviewCards('exp', ['a', 'b']);
    progress().addReviewCards('exp', ['b', 'c']);
    expect(progress().reviewQueue.map((card) => card.cardId)).toEqual(['a', 'b', 'c']);
  });

  it('resets only the given experiments, with their terms and cards', () => {
    for (const id of ['exp-1', 'exp-2']) {
      progress().startExperiment(id);
      progress().encounterTerms(id, [`term-${id}`]);
      progress().addReviewCards(id, ['card']);
    }
    progress().resetExperiments(['exp-1']);
    expect(Object.keys(progress().experiments)).toEqual(['exp-2']);
    expect(Object.keys(progress().terms)).toEqual(['term-exp-2']);
    expect(progress().reviewQueue.map((card) => card.experimentId)).toEqual(['exp-2']);
  });
});

describe('progress storage', () => {
  it('saves a versioned copy to localStorage and reads it back', async () => {
    progress().startExperiment('exp');
    progress().savePrediction('exp', 'turn', true);
    const stored = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null');
    expect(stored.version).toBe(PROGRESS_VERSION);
    expect(stored.state.experiments.exp.prediction.choice).toBe('turn');

    useProgressStore.setState({ experiments: {}, terms: {}, reviewQueue: [] }, false);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(stored));
    await useProgressStore.persist.rehydrate();
    expect(progress().experiments.exp?.prediction?.choice).toBe('turn');
  });

  it('sets unreadable data aside under a backup key instead of losing it', async () => {
    for (const raw of ['{not json', JSON.stringify({ version: 99, state: {} })]) {
      localStorage.clear();
      localStorage.setItem(PROGRESS_KEY, raw);
      await useProgressStore.persist.rehydrate();
      const backups = Object.keys(localStorage).filter((key) =>
        key.startsWith(`${PROGRESS_KEY}:unreadable:`),
      );
      expect(backups).toHaveLength(1);
      expect(localStorage.getItem(backups[0] ?? '')).toBe(raw);
      expect(progress().experiments).toEqual({});
    }
  });
});
