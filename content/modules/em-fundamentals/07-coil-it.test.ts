import { describe, expect, it } from 'vitest';
import {
  clipsHeld,
  coilTray,
  type CoilTrayControls,
  type CoilTrayState,
} from '@/models/coil-tray/definition';
import { coilIt } from './07-coil-it';

// Lesson 7's copy makes claims about the model: the prediction's answer, what the Why says the
// clips did, and the prompts. These check each claim against the model itself.

const FRAME = 1 / 60;
const { predict, prompts } = coilIt.steps.try;
const OFF: CoilTrayControls = { switch: false, core: false };

function hold(state: CoilTrayState, controls: CoilTrayControls, seconds: number) {
  let next = state;
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    next = coilTray.step({ state: next, controls, time: 0 }, FRAME);
  }
  return next;
}

function done(index: number, state: CoilTrayState, controls: CoilTrayControls): boolean {
  return prompts[index]?.doneWhen?.({ state, controls, time: 0 }) === true;
}

const start = coilTray.createState(OFF);

describe('lesson 7 against its model', () => {
  it('has the right answer to its prediction: the iron core lifts more clips', () => {
    expect(predict?.answer).toBe('more');
    const coilAlone = hold(start, { switch: true, core: false }, 2);
    const withCore = hold(coilAlone, { switch: true, core: true }, 2);
    expect(clipsHeld(withCore)).toBeGreaterThan(clipsHeld(coilAlone));
    // As the Why says: the coil alone lifts none here, and the core lifts a good handful.
    expect(clipsHeld(coilAlone)).toBe(0);
    expect(clipsHeld(withCore)).toBeGreaterThanOrEqual(6);
  });

  it('hangs clips from both ends, like a bar magnet', () => {
    const lit = hold(start, { switch: true, core: true }, 2);
    const held = lit.clips.filter((clip) => clip.phase === 'held');
    expect(held.some((clip) => clip.position.x > 0)).toBe(true);
    expect(held.some((clip) => clip.position.x < 0)).toBe(true);
  });

  it('drops every clip when the switch opens, or the core comes out', () => {
    const lit = hold(start, { switch: true, core: true }, 2);
    const opened = hold(lit, { switch: false, core: true }, 1);
    expect(opened.clips.every((clip) => clip.phase === 'resting')).toBe(true);
    const pulledOut = hold(lit, { switch: true, core: false }, 1);
    expect(clipsHeld(pulledOut)).toBe(0);
  });

  it('starts with no prompt done, and ticks each by doing what it says', () => {
    expect(prompts.map((_, index) => done(index, start, OFF))).toEqual([false, false, false]);
    const closed = hold(start, { switch: true, core: false }, 0.5);
    expect(done(0, closed, { switch: true, core: false })).toBe(true);
    expect(done(1, closed, { switch: true, core: false })).toBe(false);
    const cored = hold(closed, { switch: true, core: true }, 1);
    expect(done(1, cored, { switch: true, core: true })).toBe(true);
    const opened = hold(cored, { switch: false, core: true }, 1);
    expect(done(2, opened, { switch: false, core: true })).toBe(true);
  });
});
