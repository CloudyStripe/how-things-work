import { describe, expect, it } from 'vitest';
import { afterAnswer, BOX_WAITS_DAYS, firstSchedule, isDue } from './scheduler';

const DAY = 24 * 60 * 60 * 1000;
const START = new Date('2026-11-04T09:00:00.000Z');
const daysAfter = (at: string, from: Date) => (new Date(at).getTime() - from.getTime()) / DAY;

describe('the review scheduler', () => {
  it('uses the spec’s waits of one, three, seven, fourteen and thirty days', () => {
    expect([...BOX_WAITS_DAYS]).toEqual([1, 3, 7, 14, 30]);
  });

  it('starts a new card in the first box, due a day later', () => {
    const schedule = firstSchedule(START);
    expect(schedule.box).toBe(0);
    expect(daysAfter(schedule.dueAt, START)).toBe(1);
  });

  it('moves a remembered card up a box at a time, waiting longer each time, up to thirty days', () => {
    let box = 0;
    const waits: number[] = [];
    for (let answer = 0; answer < 6; answer++) {
      const next = afterAnswer(box, true, START);
      waits.push(daysAfter(next.dueAt, START));
      box = next.box;
    }
    expect(waits).toEqual([3, 7, 14, 30, 30, 30]);
  });

  it('sends a forgotten card back to the first box', () => {
    const next = afterAnswer(3, false, START);
    expect(next.box).toBe(0);
    expect(daysAfter(next.dueAt, START)).toBe(1);
  });

  it('counts a card as due from its due time on', () => {
    const { dueAt } = firstSchedule(START);
    expect(isDue({ dueAt }, new Date(START.getTime() + DAY - 1))).toBe(false);
    expect(isDue({ dueAt }, new Date(START.getTime() + DAY))).toBe(true);
  });
});
