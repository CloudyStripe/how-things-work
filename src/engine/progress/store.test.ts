import { beforeEach, describe, expect, it } from 'vitest';
import { clearProgressForTests, PROGRESS_KEY, PROGRESS_VERSION, useProgressStore } from './store';

const progress = () => useProgressStore.getState();

beforeEach(() => {
  clearProgressForTests();
  localStorage.clear();
});

describe('progress actions', () => {
  it('starts a lesson once, at Look', () => {
    progress().startLesson('lesson');
    progress().goToStep('lesson', 'try');
    progress().startLesson('lesson');
    expect(progress().lessons.lesson?.step).toBe('try');
  });

  it('records each completed step once', () => {
    progress().startLesson('lesson');
    progress().completeStep('lesson', 'look');
    progress().completeStep('lesson', 'look');
    expect(progress().lessons.lesson?.completedSteps).toEqual(['look']);
  });

  it('keeps the first committed prediction', () => {
    progress().startLesson('lesson');
    progress().savePrediction('lesson', 'away', true);
    progress().savePrediction('lesson', 'still', false);
    expect(progress().lessons.lesson?.prediction).toMatchObject({ choice: 'away', correct: true });
  });

  it('marks the challenge and the lesson complete once', () => {
    progress().startLesson('lesson');
    progress().completeChallenge('lesson');
    const first = progress().lessons.lesson?.challengeCompletedAt;
    progress().completeChallenge('lesson');
    progress().completeLesson('lesson');
    expect(progress().lessons.lesson?.challengeCompletedAt).toBe(first);
    expect(progress().lessons.lesson?.completedAt).toBeDefined();
  });

  it('remembers where each term was first met', () => {
    progress().encounterTerms('lesson-1', ['magnetic-pole']);
    progress().encounterTerms('lesson-2', ['magnetic-pole', 'repulsion']);
    expect(progress().terms['magnetic-pole']?.lessonId).toBe('lesson-1');
    expect(progress().terms.repulsion?.lessonId).toBe('lesson-2');
  });

  it('queues each recall card once', () => {
    progress().addReviewCards('lesson', ['a', 'b']);
    progress().addReviewCards('lesson', ['b', 'c']);
    expect(progress().reviewQueue.map((card) => card.cardId)).toEqual(['a', 'b', 'c']);
  });

  it('resets only the given lessons, with their terms and cards', () => {
    for (const id of ['lesson-1', 'lesson-2']) {
      progress().startLesson(id);
      progress().encounterTerms(id, [`term-${id}`]);
      progress().addReviewCards(id, ['card']);
    }
    progress().resetLessons(['lesson-1']);
    expect(Object.keys(progress().lessons)).toEqual(['lesson-2']);
    expect(Object.keys(progress().terms)).toEqual(['term-lesson-2']);
    expect(progress().reviewQueue.map((card) => card.lessonId)).toEqual(['lesson-2']);
  });
});

describe('progress storage', () => {
  it('saves a versioned copy to localStorage and reads it back', async () => {
    progress().startLesson('lesson');
    progress().savePrediction('lesson', 'away', true);
    const stored = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null');
    expect(stored.version).toBe(PROGRESS_VERSION);
    expect(stored.state.lessons.lesson.prediction.choice).toBe('away');

    useProgressStore.setState({ lessons: {}, terms: {}, reviewQueue: [] }, false);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(stored));
    await useProgressStore.persist.rehydrate();
    expect(progress().lessons.lesson?.prediction?.choice).toBe('away');
  });

  it('sets version 1 (experiment) progress aside, since the lesson redesign replaced it', async () => {
    const versionOne = JSON.stringify({
      version: 1,
      state: { experiments: {}, terms: {}, reviewQueue: [] },
    });
    localStorage.setItem(PROGRESS_KEY, versionOne);
    await useProgressStore.persist.rehydrate();
    const backups = Object.keys(localStorage).filter((key) =>
      key.startsWith(`${PROGRESS_KEY}:unreadable:`),
    );
    expect(backups.map((key) => localStorage.getItem(key))).toEqual([versionOne]);
    expect(progress().lessons).toEqual({});
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
      expect(progress().lessons).toEqual({});
    }
  });
});
