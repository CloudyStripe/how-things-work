import { z } from 'zod';
import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { STEP_KINDS, type StepKind } from '@/engine/content/schema';
import { afterAnswer, firstSchedule } from '@/review/scheduler';

// The learner's progress, kept in this browser's localStorage. The stored shape is versioned
// and checked on load; anything unreadable is set aside under a backup key, never discarded.

export const PROGRESS_KEY = 'how-things-work:progress';
export const PROGRESS_VERSION = 3;

const timestamp = z.iso.datetime();
const stepKind = z.enum(STEP_KINDS);

const lessonProgressSchema = z.object({
  /** The step the learner is on, so the lesson resumes there. */
  step: stepKind,
  completedSteps: z.array(stepKind),
  /** The committed prediction. Once saved it cannot change. */
  prediction: z.object({ choice: z.string(), correct: z.boolean(), at: timestamp }).optional(),
  challengeCompletedAt: timestamp.optional(),
  completedAt: timestamp.optional(),
  startedAt: timestamp,
  updatedAt: timestamp,
});
export type LessonProgress = z.infer<typeof lessonProgressSchema>;

/** Where a review card sits in the spaced-review boxes, and when it is next due. */
const scheduled = {
  /** The lesson it came from: resetting that lesson removes it. */
  lessonId: z.string(),
  addedAt: timestamp,
  box: z.int().min(0),
  dueAt: timestamp,
};

/**
 * A card in the review queue: one of a lesson's recall cards, or one of the two cards every term
 * makes once it is met ("What is this called?" and "Explain this term").
 */
const reviewCardSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('recall'), cardId: z.string(), ...scheduled }),
  z.object({
    source: z.literal('term'),
    termId: z.string(),
    ask: z.enum(['name', 'explain']),
    ...scheduled,
  }),
]);
export type ReviewCard = z.infer<typeof reviewCardSchema>;

/** One card's identity in the queue, whatever its source. */
export function reviewCardKey(card: ReviewCard): string {
  return card.source === 'recall'
    ? `recall:${card.lessonId}:${card.cardId}`
    : `term:${card.termId}:${card.ask}`;
}

const TERM_ASKS = ['name', 'explain'] as const;

const progressDataSchema = z.object({
  lessons: z.record(z.string(), lessonProgressSchema),
  /** Each term the learner has met: the lesson that named it, and when. */
  terms: z.record(z.string(), z.object({ lessonId: z.string(), at: timestamp })),
  /** Review cards, each with its place in the spaced-review boxes. */
  reviewQueue: z.array(reviewCardSchema),
});
export type ProgressData = z.infer<typeof progressDataSchema>;

// When the stored shape changes, bump PROGRESS_VERSION and migrate older data here. Version 1
// (experiments, before the lesson redesign) held only the Phase 3 dummy lesson, so it is not
// migrated: like any unreadable data, it is set aside under a backup key. Version 2 queued
// recall cards with no schedule; each is scheduled as if new from when it was added, and every
// term already met gets its two term cards.
const storedSchema = z.object({ version: z.literal(PROGRESS_VERSION), state: progressDataSchema });

const versionTwoSchema = z.object({
  version: z.literal(2),
  state: z.object({
    lessons: z.record(z.string(), lessonProgressSchema),
    terms: z.record(z.string(), z.object({ lessonId: z.string(), at: timestamp })),
    reviewQueue: z.array(
      z.object({ lessonId: z.string(), cardId: z.string(), addedAt: timestamp }),
    ),
  }),
});

function fromVersionTwo(stored: z.infer<typeof versionTwoSchema>): ProgressData {
  const { lessons, terms, reviewQueue } = stored.state;
  const recall = reviewQueue.map((card): ReviewCard => ({
    source: 'recall',
    ...card,
    ...firstSchedule(new Date(card.addedAt)),
  }));
  const termCards = Object.entries(terms).flatMap(([termId, met]) =>
    TERM_ASKS.map((ask): ReviewCard => ({
      source: 'term',
      termId,
      ask,
      lessonId: met.lessonId,
      addedAt: met.at,
      ...firstSchedule(new Date(met.at)),
    })),
  );
  return { lessons, terms, reviewQueue: [...recall, ...termCards] };
}

const EMPTY: ProgressData = { lessons: {}, terms: {}, reviewQueue: [] };

interface ProgressActions {
  startLesson(lessonId: string): void;
  goToStep(lessonId: string, step: StepKind): void;
  completeStep(lessonId: string, step: StepKind): void;
  savePrediction(lessonId: string, choice: string, correct: boolean): void;
  completeChallenge(lessonId: string): void;
  completeLesson(lessonId: string): void;
  encounterTerms(lessonId: string, termIds: readonly string[]): void;
  /** Queues a finished lesson's recall cards, and the two cards for each term it named. */
  addReviewCards(lessonId: string, cardIds: readonly string[], termIds?: readonly string[]): void;
  /** Reschedules a card once the learner says whether they remembered it. */
  answerCard(key: string, remembered: boolean): void;
  /** Clears everything recorded for these lessons, including terms met and queued cards. */
  resetLessons(lessonIds: readonly string[]): void;
}

export type ProgressStore = ProgressData & ProgressActions;

const storage: PersistStorage<ProgressData> = {
  getItem(name) {
    const raw = localStorage.getItem(name);
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      const older = versionTwoSchema.safeParse(parsed);
      if (older.success) return { version: PROGRESS_VERSION, state: fromVersionTwo(older.data) };
      return storedSchema.parse(parsed) as StorageValue<ProgressData>;
    } catch {
      localStorage.setItem(`${name}:unreadable:${new Date().toISOString()}`, raw);
      return null;
    }
  },
  setItem(name, value) {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem(name) {
    localStorage.removeItem(name);
  },
};

function now(): string {
  return new Date().toISOString();
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => {
      /** Applies a change to one lesson's record, if it exists, and stamps it. */
      function updateLesson(
        lessonId: string,
        change: (progress: LessonProgress) => Partial<LessonProgress>,
      ) {
        const current = get().lessons[lessonId];
        if (current === undefined) return;
        set({
          lessons: {
            ...get().lessons,
            [lessonId]: { ...current, ...change(current), updatedAt: now() },
          },
        });
      }

      return {
        ...EMPTY,

        startLesson(lessonId) {
          if (get().lessons[lessonId] !== undefined) return;
          const at = now();
          set({
            lessons: {
              ...get().lessons,
              [lessonId]: {
                step: 'look',
                completedSteps: [],
                startedAt: at,
                updatedAt: at,
              },
            },
          });
        },

        goToStep(lessonId, step) {
          updateLesson(lessonId, () => ({ step }));
        },

        completeStep(lessonId, step) {
          updateLesson(lessonId, (progress) =>
            progress.completedSteps.includes(step)
              ? {}
              : { completedSteps: [...progress.completedSteps, step] },
          );
        },

        savePrediction(lessonId, choice, correct) {
          updateLesson(lessonId, (progress) =>
            progress.prediction !== undefined ? {} : { prediction: { choice, correct, at: now() } },
          );
        },

        completeChallenge(lessonId) {
          updateLesson(lessonId, (progress) =>
            progress.challengeCompletedAt !== undefined ? {} : { challengeCompletedAt: now() },
          );
        },

        completeLesson(lessonId) {
          updateLesson(lessonId, (progress) =>
            progress.completedAt !== undefined ? {} : { completedAt: now() },
          );
        },

        encounterTerms(lessonId, termIds) {
          const fresh = termIds.filter((termId) => get().terms[termId] === undefined);
          if (fresh.length === 0) return;
          const at = now();
          const met = Object.fromEntries(fresh.map((termId) => [termId, { lessonId, at }]));
          set({ terms: { ...get().terms, ...met } });
        },

        addReviewCards(lessonId, cardIds, termIds = []) {
          const queue = get().reviewQueue;
          const at = new Date();
          const addedAt = at.toISOString();
          const candidates: ReviewCard[] = [
            ...cardIds.map((cardId): ReviewCard => ({
              source: 'recall',
              cardId,
              lessonId,
              addedAt,
              ...firstSchedule(at),
            })),
            ...termIds.flatMap((termId) =>
              TERM_ASKS.map((ask): ReviewCard => ({
                source: 'term',
                termId,
                ask,
                lessonId,
                addedAt,
                ...firstSchedule(at),
              })),
            ),
          ];
          // Each card is queued once: finishing a lesson again leaves its schedule alone.
          const known = new Set(queue.map(reviewCardKey));
          const fresh = candidates.filter((card) => !known.has(reviewCardKey(card)));
          if (fresh.length === 0) return;
          set({ reviewQueue: [...queue, ...fresh] });
        },

        answerCard(key, remembered) {
          const at = new Date();
          set({
            reviewQueue: get().reviewQueue.map((card) =>
              reviewCardKey(card) === key
                ? { ...card, ...afterAnswer(card.box, remembered, at) }
                : card,
            ),
          });
        },

        resetLessons(lessonIds) {
          const cleared = new Set(lessonIds);
          const { lessons, terms, reviewQueue } = get();
          set({
            lessons: Object.fromEntries(Object.entries(lessons).filter(([id]) => !cleared.has(id))),
            terms: Object.fromEntries(
              Object.entries(terms).filter(([, met]) => !cleared.has(met.lessonId)),
            ),
            reviewQueue: reviewQueue.filter((card) => !cleared.has(card.lessonId)),
          });
        },
      };
    },
    {
      name: PROGRESS_KEY,
      version: PROGRESS_VERSION,
      storage,
      partialize: ({ lessons, terms, reviewQueue }) => ({ lessons, terms, reviewQueue }),
    },
  ),
);

/** Empties progress in memory and storage. For tests. */
export function clearProgressForTests(): void {
  useProgressStore.setState(EMPTY);
  localStorage.removeItem(PROGRESS_KEY);
}
