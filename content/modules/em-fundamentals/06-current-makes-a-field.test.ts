import { describe, expect, it } from 'vitest';
import {
  COMPASSES,
  offNorth,
  wireBoard,
  type WireBoardControls,
  type WireBoardState,
} from '@/models/wire-board/definition';
import { currentMakesAField } from './06-current-makes-a-field';

// Lesson 6's copy makes claims about the model: the prediction's answer, what the Why says the
// compasses did, and the prompts. These check each claim against the model itself.

const FRAME = 1 / 60;
const { predict, prompts } = currentMakesAField.steps.try;
const OFF: WireBoardControls = { switch: false, battery: false };

function hold(state: WireBoardState, controls: WireBoardControls, seconds: number) {
  let next = state;
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    next = wireBoard.step({ state: next, controls, time: 0 }, FRAME);
  }
  return next;
}

function done(index: number, state: WireBoardState, controls: WireBoardControls): boolean {
  return prompts[index]?.doneWhen?.({ state, controls, time: 0 }) === true;
}

/** A needle's direction on the bench (x east, z south) from its bearing. */
function pointing(angle: number): { x: number; z: number } {
  return { x: Math.sin(angle), z: -Math.cos(angle) };
}

const start = wireBoard.createState(OFF);
const near = COMPASSES.map((at, index) => ({ at, index })).filter(
  ({ at }) => Math.hypot(at.x, at.z) < 0.05,
);
const far = COMPASSES.map((at, index) => ({ at, index })).filter(
  ({ at }) => Math.hypot(at.x, at.z) > 0.1,
);

describe('lesson 6 against its model', () => {
  it('has the right answer to its prediction: the near compasses point round the wire', () => {
    expect(predict?.answer).toBe('around');
    const on = hold(start, { switch: true, battery: false }, 3);
    expect(near.length).toBe(8);
    for (const { at, index } of near) {
      const needle = pointing(on.needles[index]?.angle ?? 0);
      const out = Math.hypot(at.x, at.z);
      // Across the line out from the wire, not along it: round, not toward or away.
      const along = (needle.x * at.x + needle.z * at.z) / out;
      expect(Math.abs(along)).toBeLessThan(0.45);
    }
  });

  it('turns the compasses farther out less than the ones close in', () => {
    const on = hold(start, { switch: true, battery: false }, 3);
    const turned = (group: typeof near) =>
      group.reduce(
        (sum, { index }) => sum + offNorth(on.needles[index] ?? { angle: 0, angularVelocity: 0 }),
        0,
      ) / group.length;
    expect(turned(far)).toBeLessThan(turned(near));
  });

  it('reverses every near compass when the battery is turned round', () => {
    const up = hold(start, { switch: true, battery: false }, 3);
    const down = hold(up, { switch: true, battery: true }, 3);
    for (const { index } of near) {
      const a = pointing(up.needles[index]?.angle ?? 0);
      const b = pointing(down.needles[index]?.angle ?? 0);
      expect(a.x * b.x + a.z * b.z).toBeLessThan(0);
    }
  });

  it('starts with no prompt done, and ticks each by doing what it says', () => {
    expect(prompts.map((_, index) => done(index, start, OFF))).toEqual([false, false, false]);
    const up = hold(start, { switch: true, battery: false }, 1);
    expect(done(0, up, { switch: true, battery: false })).toBe(true);
    expect(done(1, up, { switch: true, battery: false })).toBe(false);
    const down = hold(up, { switch: true, battery: true }, 1);
    expect(done(1, down, { switch: true, battery: true })).toBe(true);
    const open = hold(down, { switch: false, battery: true }, 4);
    expect(done(2, open, { switch: false, battery: true })).toBe(true);
  });
});
