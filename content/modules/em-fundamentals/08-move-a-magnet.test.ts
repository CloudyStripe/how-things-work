import { describe, expect, it } from 'vitest';
import { coilMagnet, type CoilMagnetState } from '@/models/coil-magnet/definition';
import { moveAMagnet } from './08-move-a-magnet';

// Lesson 8's copy makes claims about the model: the prediction's answer, what the Why says the
// needle and the lights did, and the prompts. These check each claim against the model itself.

const FRAME = 1 / 60;
const { predict, prompts } = moveAMagnet.steps.try;

interface Run {
  readonly state: CoilMagnetState;
  readonly position: number;
  /** The needle's largest swing on the way (rad, signed), and the LEDs' largest current (A). */
  readonly swing: number;
  readonly led: number;
}

/** Slides the magnet to `to` over `seconds`, then holds it there for `hold` seconds. */
function slide(from: Run, to: number, seconds: number, hold = 1): Run {
  let { state } = from;
  let swing = 0;
  let led = 0;
  const frames = Math.max(1, Math.round(seconds / FRAME));
  for (let frame = 1; frame <= frames + Math.round(hold / FRAME); frame++) {
    const position = from.position + (to - from.position) * Math.min(1, frame / frames);
    state = coilMagnet.step({ state, controls: { position }, time: 0 }, FRAME);
    if (Math.abs(state.needle.angle) > Math.abs(swing)) swing = state.needle.angle;
    led = Math.max(led, Math.abs(state.ledCurrent));
  }
  return { state, position: to, swing, led };
}

function done(index: number, { state, position }: Run): boolean {
  return prompts[index]?.doneWhen?.({ state, controls: { position }, time: 0 }) === true;
}

const start: Run = {
  state: coilMagnet.createState({ position: 0 }),
  position: 0,
  swing: 0,
  led: 0,
};

describe('lesson 8 against its model', () => {
  it('has the right answer to its prediction: a still magnet makes no current at all', () => {
    expect(predict?.answer).toBe('none');
    const inside = slide(start, 1, 2, 2);
    expect(inside.state.emf).toBe(0);
    expect(inside.state.meterCurrent).toBe(0);
    expect(Math.abs(inside.state.needle.angle)).toBeLessThan(0.01);
  });

  it('swings the needle opposite ways going in and coming out', () => {
    const pushed = slide(start, 1, 2);
    const pulled = slide(pushed, 0, 2);
    expect(Math.abs(pushed.swing)).toBeGreaterThan(0.1);
    expect(Math.sign(pulled.swing)).toBe(-Math.sign(pushed.swing));
  });

  it('swings further, and lights a light, on a quicker push', () => {
    const slow = slide(start, 1, 2);
    const quick = slide(start, 1, 0.3);
    expect(Math.abs(quick.swing)).toBeGreaterThan(Math.abs(slow.swing));
    expect(slow.led).toBe(0);
    expect(quick.led).toBeGreaterThan(0);
  });

  it('starts with no prompt done, and ticks each by doing what it says', () => {
    expect(prompts.map((_, index) => done(index, start))).toEqual([false, false, false, false]);
    const pushed = slide(start, 1, 2, 1.5);
    expect([done(0, pushed), done(1, pushed), done(2, pushed), done(3, pushed)]).toEqual([
      true,
      true,
      false,
      false,
    ]);
    const pulled = slide(pushed, 0, 2);
    expect(done(2, pulled)).toBe(true);
    expect(done(3, pulled)).toBe(false);
    const quick = slide(pulled, 1, 0.3);
    expect(done(3, quick)).toBe(true);
  });
});
