import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearProgressForTests,
  PROGRESS_KEY,
  PROGRESS_VERSION,
  reviewCardKey,
  useProgressStore,
} from './store';

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

  it('queues each recall card once, due a day later, with two cards per term named', () => {
    progress().addReviewCards('lesson', ['a', 'b'], ['magnetic-pole']);
    progress().addReviewCards('lesson', ['b', 'c'], ['magnetic-pole']);
    expect(progress().reviewQueue.map(reviewCardKey)).toEqual([
      'recall:lesson:a',
      'recall:lesson:b',
      'term:magnetic-pole:name',
      'term:magnetic-pole:explain',
      'recall:lesson:c',
    ]);
    for (const card of progress().reviewQueue) {
      expect(card.box).toBe(0);
      const wait = new Date(card.dueAt).getTime() - new Date(card.addedAt).getTime();
      expect(wait).toBe(24 * 60 * 60 * 1000);
    }
  });

  it('moves a remembered card up a box and a forgotten one back to the first', () => {
    progress().addReviewCards('lesson', ['a', 'b']);
    progress().answerCard('recall:lesson:a', true);
    progress().answerCard('recall:lesson:b', true);
    progress().answerCard('recall:lesson:b', false);
    const [a, b] = progress().reviewQueue;
    expect(a?.box).toBe(1);
    expect(b?.box).toBe(0);
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

  it('brings version 2 progress forward, scheduling its queued cards and met terms', async () => {
    const addedAt = '2026-11-03T10:00:00.000Z';
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        version: 2,
        state: {
          lessons: {},
          terms: { repulsion: { lessonId: 'what-magnets-do', at: addedAt } },
          reviewQueue: [{ lessonId: 'what-magnets-do', cardId: 'two-north-poles', addedAt }],
        },
      }),
    );
    await useProgressStore.persist.rehydrate();
    expect(progress().reviewQueue.map(reviewCardKey)).toEqual([
      'recall:what-magnets-do:two-north-poles',
      'term:repulsion:name',
      'term:repulsion:explain',
    ]);
    expect(progress().reviewQueue[0]?.dueAt).toBe('2026-11-04T10:00:00.000Z');
    expect(
      Object.keys(localStorage).some((key) => key.startsWith(PROGRESS_KEY + ':unreadable:')),
    ).toBe(false);
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
