import { z } from 'zod';
import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { STEP_KINDS, type StepKind } from '@/engine/content/schema';

// The learner's progress, kept in this browser's localStorage. The stored shape is versioned
// and checked on load; anything unreadable is set aside under a backup key, never discarded.

export const PROGRESS_KEY = 'how-things-work:progress';
export const PROGRESS_VERSION = 1;

const timestamp = z.iso.datetime();
const stepKind = z.enum(STEP_KINDS);

const experimentProgressSchema = z.object({
  /** The step the learner is on, so the experiment resumes there. */
  step: stepKind,
  completedSteps: z.array(stepKind),
  /** The committed prediction. Once saved it cannot change. */
  prediction: z.object({ choice: z.string(), correct: z.boolean(), at: timestamp }).optional(),
  challengeCompletedAt: timestamp.optional(),
  completedAt: timestamp.optional(),
  startedAt: timestamp,
  updatedAt: timestamp,
});
export type ExperimentProgress = z.infer<typeof experimentProgressSchema>;

const progressDataSchema = z.object({
  experiments: z.record(z.string(), experimentProgressSchema),
  /** Each term the learner has met: the experiment that named it, and when. */
  terms: z.record(z.string(), z.object({ experimentId: z.string(), at: timestamp })),
  /** Recall cards waiting for review. Scheduling them arrives with the Review page (Phase 7). */
  reviewQueue: z.array(
    z.object({ experimentId: z.string(), cardId: z.string(), addedAt: timestamp }),
  ),
});
export type ProgressData = z.infer<typeof progressDataSchema>;

// When the stored shape changes, bump PROGRESS_VERSION and migrate older data here.
const storedSchema = z.object({ version: z.literal(PROGRESS_VERSION), state: progressDataSchema });

const EMPTY: ProgressData = { experiments: {}, terms: {}, reviewQueue: [] };

interface ProgressActions {
  startExperiment(experimentId: string): void;
  goToStep(experimentId: string, step: StepKind): void;
  completeStep(experimentId: string, step: StepKind): void;
  savePrediction(experimentId: string, choice: string, correct: boolean): void;
  completeChallenge(experimentId: string): void;
  completeExperiment(experimentId: string): void;
  encounterTerms(experimentId: string, termIds: readonly string[]): void;
  addReviewCards(experimentId: string, cardIds: readonly string[]): void;
  /** Clears everything recorded for these experiments, including terms met and queued cards. */
  resetExperiments(experimentIds: readonly string[]): void;
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
      /** Applies a change to one experiment's record, if it exists, and stamps it. */
      function updateExperiment(
        experimentId: string,
        change: (progress: ExperimentProgress) => Partial<ExperimentProgress>,
      ) {
        const current = get().experiments[experimentId];
        if (current === undefined) return;
        set({
          experiments: {
            ...get().experiments,
            [experimentId]: { ...current, ...change(current), updatedAt: now() },
          },
        });
      }

      return {
        ...EMPTY,

        startExperiment(experimentId) {
          if (get().experiments[experimentId] !== undefined) return;
          const at = now();
          set({
            experiments: {
              ...get().experiments,
              [experimentId]: {
                step: 'hook',
                completedSteps: [],
                startedAt: at,
                updatedAt: at,
              },
            },
          });
        },

        goToStep(experimentId, step) {
          updateExperiment(experimentId, () => ({ step }));
        },

        completeStep(experimentId, step) {
          updateExperiment(experimentId, (progress) =>
            progress.completedSteps.includes(step)
              ? {}
              : { completedSteps: [...progress.completedSteps, step] },
          );
        },

        savePrediction(experimentId, choice, correct) {
          updateExperiment(experimentId, (progress) =>
            progress.prediction !== undefined ? {} : { prediction: { choice, correct, at: now() } },
          );
        },

        completeChallenge(experimentId) {
          updateExperiment(experimentId, (progress) =>
            progress.challengeCompletedAt !== undefined ? {} : { challengeCompletedAt: now() },
          );
        },

        completeExperiment(experimentId) {
          updateExperiment(experimentId, (progress) =>
            progress.completedAt !== undefined ? {} : { completedAt: now() },
          );
        },

        encounterTerms(experimentId, termIds) {
          const fresh = termIds.filter((termId) => get().terms[termId] === undefined);
          if (fresh.length === 0) return;
          const at = now();
          const met = Object.fromEntries(fresh.map((termId) => [termId, { experimentId, at }]));
          set({ terms: { ...get().terms, ...met } });
        },

        addReviewCards(experimentId, cardIds) {
          const queue = get().reviewQueue;
          const fresh = cardIds.filter(
            (cardId) =>
              !queue.some((card) => card.experimentId === experimentId && card.cardId === cardId),
          );
          if (fresh.length === 0) return;
          const addedAt = now();
          set({
            reviewQueue: [...queue, ...fresh.map((cardId) => ({ experimentId, cardId, addedAt }))],
          });
        },

        resetExperiments(experimentIds) {
          const cleared = new Set(experimentIds);
          const { experiments, terms, reviewQueue } = get();
          set({
            experiments: Object.fromEntries(
              Object.entries(experiments).filter(([id]) => !cleared.has(id)),
            ),
            terms: Object.fromEntries(
              Object.entries(terms).filter(([, met]) => !cleared.has(met.experimentId)),
            ),
            reviewQueue: reviewQueue.filter((card) => !cleared.has(card.experimentId)),
          });
        },
      };
    },
    {
      name: PROGRESS_KEY,
      version: PROGRESS_VERSION,
      storage,
      partialize: ({ experiments, terms, reviewQueue }) => ({ experiments, terms, reviewQueue }),
    },
  ),
);

/** Empties progress in memory and storage. For tests. */
export function clearProgressForTests(): void {
  useProgressStore.setState(EMPTY);
  localStorage.removeItem(PROGRESS_KEY);
}
