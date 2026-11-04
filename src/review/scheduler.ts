// Spaced review, Leitner style: each card sits in a box, and each box has its own wait before the
// card comes back. Remembering a card moves it up a box, so it waits longer next time; forgetting
// it sends it back to the first box.

/** How many days a card in each box waits before it is due again. */
export const BOX_WAITS_DAYS = [1, 3, 7, 14, 30] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Schedule {
  /** Which box the card is in, from 0. */
  readonly box: number;
  /** When it is next due (ISO time). */
  readonly dueAt: string;
}

function after(at: Date, box: number): string {
  const days = BOX_WAITS_DAYS[Math.min(box, BOX_WAITS_DAYS.length - 1)] ?? 1;
  return new Date(at.getTime() + days * DAY_MS).toISOString();
}

/** A new card starts in the first box, due a day after it is added. */
export function firstSchedule(addedAt: Date): Schedule {
  return { box: 0, dueAt: after(addedAt, 0) };
}

/** The card's next schedule once the learner says whether they remembered it. */
export function afterAnswer(box: number, remembered: boolean, at: Date): Schedule {
  const next = remembered ? Math.min(box + 1, BOX_WAITS_DAYS.length - 1) : 0;
  return { box: next, dueAt: after(at, next) };
}

export function isDue(schedule: Pick<Schedule, 'dueAt'>, now: Date): boolean {
  return new Date(schedule.dueAt).getTime() <= now.getTime();
}
