import { describe, expect, it } from 'vitest';
import {
  crankGenerator,
  type CrankGeneratorControls,
  type CrankGeneratorState,
} from '@/models/crank-generator/definition';
import { spinIt } from './09-spin-it';

// Lesson 9's copy makes claims about the model: the prediction's answer, what the Why says the
// needle and the lights did, and the prompts. These check each claim against the model itself.

const FRAME = 1 / 60;
const { predict, prompts } = spinIt.steps.try;

interface Run {
  readonly state: CrankGeneratorState;
  readonly crank: CrankGeneratorControls['crank'];
  /** The emf's sign changes, and the needle's widest swings either way (rad). */
  readonly reversals: number;
  readonly right: number;
  readonly left: number;
}

function turn(from: CrankGeneratorState, crank: Run['crank'], seconds: number): Run {
  let state = from;
  let reversals = 0;
  let right = 0;
  let left = 0;
  let sign = 0;
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    state = crankGenerator.step({ state, controls: { crank }, time: 0 }, FRAME);
    const now = Math.sign(state.emf);
    if (now !== 0 && sign !== 0 && now !== sign) reversals++;
    if (now !== 0) sign = now;
    right = Math.max(right, state.needle.angle);
    left = Math.min(left, state.needle.angle);
  }
  return { state, crank, reversals, right, left };
}

function done(index: number, { state, crank }: Run): boolean {
  return prompts[index]?.doneWhen?.({ state, controls: { crank }, time: 0 }) === true;
}

const start = crankGenerator.createState({ crank: 'still' });

describe('lesson 9 against its model', () => {
  it('has the right answer to its prediction: the current keeps reversing', () => {
    expect(predict?.answer).toBe('back-and-forth');
    const slow = turn(start, 'slow', 6);
    // Two reversals a turn, half a turn a second: about six in six seconds, once up to speed.
    expect(slow.reversals).toBeGreaterThanOrEqual(4);
  });

  it('makes nothing while the crank is still', () => {
    const still = turn(start, 'still', 2);
    expect(still.reversals).toBe(0);
    expect(still.state.emf).toBe(0);
  });

  it('swings harder and reverses more often when turned fast, and lights both lights', () => {
    const slow = turn(start, 'slow', 6);
    const fast = turn(start, 'fast', 6);
    expect(fast.reversals).toBeGreaterThan(slow.reversals);
    expect(fast.right).toBeGreaterThan(slow.right);
    expect(slow.state.fastLit).toEqual({ red: false, green: false });
    expect(fast.state.fastLit).toEqual({ red: true, green: true });
  });

  it('starts with no prompt done, and ticks each by doing what it says', () => {
    const still: Run = { state: start, crank: 'still', reversals: 0, right: 0, left: 0 };
    expect([done(0, still), done(1, still)]).toEqual([false, false]);
    const slow = turn(start, 'slow', 6);
    expect([done(0, slow), done(1, slow)]).toEqual([true, false]);
    const fast = turn(slow.state, 'fast', 4);
    expect(done(1, fast)).toBe(true);
  });
});
