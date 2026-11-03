import { describe, expect, it } from 'vitest';
import {
  BULB,
  circuitBoard,
  CLOSED_CURRENT,
  type CircuitBoardState,
} from '@/models/circuit-board/definition';
import { whatCurrentIs } from './05-what-current-is';

// Lesson 5's copy makes claims about the model: the prediction's answer and the prompts. These
// check each claim against the model itself.

const FRAME = 1 / 60;
const { predict, prompts } = whatCurrentIs.steps.try;

function hold(state: CircuitBoardState, closed: boolean, seconds: number): CircuitBoardState {
  let next = state;
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    next = circuitBoard.step({ state: next, controls: { switch: closed }, time: 0 }, FRAME);
  }
  return next;
}

function done(promptIndex: number, state: CircuitBoardState, closed: boolean): boolean {
  return (
    prompts[promptIndex]?.doneWhen?.({ state, controls: { switch: closed }, time: 0 }) === true
  );
}

describe('lesson 5 against its model', () => {
  it('has the right answer to its prediction: the current goes round one loop', () => {
    expect(predict?.answer).toBe('loop');
    const closed = hold(circuitBoard.createState({ switch: true }), true, 0.5);
    const paths =
      circuitBoard.currentPaths?.({ state: closed, controls: { switch: true }, time: 0 }) ?? [];
    // One path with one current, so it is the same all the way round.
    expect(paths).toHaveLength(1);
    const loop = paths[0]?.points ?? [];
    const [first, last] = [loop[0], loop.at(-1)];
    // It closes on itself, back where it left the battery...
    expect(
      first !== undefined && last !== undefined && Math.hypot(first.x - last.x, first.z - last.z),
    ).toBeLessThan(1e-9);
    // ...and goes through the bulb on the way.
    expect(loop.some((point) => Math.abs(point.x - BULB.x) < 0.002 && point.y > 0.03)).toBe(true);
    expect(paths[0]?.current).toBeCloseTo(CLOSED_CURRENT, 12);
  });

  it('lights the bulb only while the switch is closed', () => {
    const open = hold(circuitBoard.createState({ switch: false }), false, 1);
    expect(open.current).toBe(0);
    expect(open.glow).toBe(0);
    const closed = hold(open, true, 0.3);
    expect(closed.glow).toBeGreaterThan(0.9);
    const reopened = hold(closed, false, 0.3);
    expect(reopened.current).toBe(0);
    expect(reopened.glow).toBeLessThan(0.01);
  });

  it('starts with no prompt done, and ticks each by doing what it says', () => {
    const start = circuitBoard.createState({ switch: false });
    expect([done(0, start, false), done(1, start, false)]).toEqual([false, false]);
    const closed = hold(start, true, 0.3);
    expect([done(0, closed, true), done(1, closed, true)]).toEqual([true, false]);
    const reopened = hold(closed, false, 0.3);
    expect(done(1, reopened, false)).toBe(true);
  });
});
