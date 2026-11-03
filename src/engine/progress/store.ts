import { z } from 'zod';
import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { STEP_KINDS, type StepKind } from '@/engine/content/schema';

// The learner's progress, kept in this browser's localStorage. The stored shape is versioned
// and checked on load; anything unreadable is set aside under a backup key, never discarded.

export const PROGRESS_KEY = 'how-things-work:progress';
export const PROGRESS_VERSION = 2;

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

const progressDataSchema = z.object({
  lessons: z.record(z.string(), lessonProgressSchema),
  /** Each term the learner has met: the lesson that named it, and when. */
  terms: z.record(z.string(), z.object({ lessonId: z.string(), at: timestamp })),
  /** Recall cards waiting for review. Scheduling them arrives with the Review page (Phase 8). */
  reviewQueue: z.array(z.object({ lessonId: z.string(), cardId: z.string(), addedAt: timestamp })),
});
export type ProgressData = z.infer<typeof progressDataSchema>;

// When the stored shape changes, bump PROGRESS_VERSION and migrate older data here. Version 1
// (experiments, before the lesson redesign) held only the Phase 3 dummy lesson, so it is not
// migrated: like any unreadable data, it is set aside under a backup key.
const storedSchema = z.object({ version: z.literal(PROGRESS_VERSION), state: progressDataSchema });

const EMPTY: ProgressData = { lessons: {}, terms: {}, reviewQueue: [] };

interface ProgressActions {
  startLesson(lessonId: string): void;
  goToStep(lessonId: string, step: StepKind): void;
  completeStep(lessonId: string, step: StepKind): void;
  savePrediction(lessonId: string, choice: string, correct: boolean): void;
  completeChallenge(lessonId: string): void;
  completeLesson(lessonId: string): void;
  encounterTerms(lessonId: string, termIds: readonly string[]): void;
  addReviewCards(lessonId: string, cardIds: readonly string[]): void;
  /** Clears everything recorded for these lessons, including terms met and queued cards. */
  resetLessons(lessonIds: readonly string[]): void;
}

export type ProgressStore = ProgressData & ProgressActions;

const storage: PersistStorage<ProgressData> = {
  getItem(name) {
    const raw = localStorage.getItem(name);
    if (raw === null) return null;
    try {
      return storedSchema.parse(JSON.parse(raw)) as StorageValue<ProgressData>;
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

        addReviewCards(lessonId, cardIds) {
          const queue = get().reviewQueue;
          const fresh = cardIds.filter(
            (cardId) => !queue.some((card) => card.lessonId === lessonId && card.cardId === cardId),
          );
          if (fresh.length === 0) return;
          const addedAt = now();
          set({
            reviewQueue: [...queue, ...fresh.map((cardId) => ({ lessonId, cardId, addedAt }))],
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
