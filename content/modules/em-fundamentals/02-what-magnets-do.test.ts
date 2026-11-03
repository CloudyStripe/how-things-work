import { describe, expect, it } from 'vitest';
import { magnetRail, type MagnetRailState } from '@/models/magnet-rail/definition';
import { whatMagnetsDo } from './02-what-magnets-do';

// Lesson 2's copy makes claims about the model: the prediction's answer, the prompts and the
// challenge. These check each claim against the model itself.

const FRAME = 1 / 60;
const { predict, prompts } = whatMagnetsDo.steps.try;

function snapshotOf(state: MagnetRailState, position: number) {
  return { state, controls: { position }, time: 0 };
}

/** Slides the magnet from one slider position to another over `seconds`, then holds a second. */
function slide(start: number, end: number, seconds: number) {
  let state = magnetRail.createState({ position: start });
  const frames = Math.round(seconds / FRAME);
  const seen: MagnetRailState[] = [];
  for (let frame = 1; frame <= frames + 60; frame++) {
    const position = start + (end - start) * Math.min(1, frame / Math.max(1, frames));
    state = magnetRail.step(snapshotOf(state, position), FRAME);
    seen.push(state);
  }
  return { state, seen, position: end };
}

function done(promptIndex: number, state: MagnetRailState, position: number): boolean {
  return prompts[promptIndex]?.doneWhen?.(snapshotOf(state, position)) === true;
}

describe('lesson 2 against its model', () => {
  it('has the right answer to its prediction: the right-hand cart rolls away', () => {
    expect(predict?.answer).toBe('away');
    const { state } = slide(0.5, 1, 4);
    expect(state.rightCart.position.x).toBeGreaterThan(
      magnetRail.createState({ position: 0.5 }).rightCart.position.x,
    );
  });

  it('starts with no prompt done', () => {
    const start = magnetRail.createState({ position: 0.5 });
    expect(prompts.map((_, index) => done(index, start, 0.5))).toEqual([false, false]);
  });

  it('ticks each prompt by doing what it says, and only that', () => {
    const right = slide(0.5, 1, 4);
    expect(done(0, right.state, right.position)).toBe(true);
    expect(done(1, right.state, right.position)).toBe(false);

    const left = slide(0.5, 0.2, 3);
    expect(done(1, left.state, left.position)).toBe(true);
    expect(done(0, left.state, left.position)).toBe(false);
  });

  it('can solve its challenge with a slow slide, but not by jumping the magnet', () => {
    const isMet = whatMagnetsDo.steps.challenge?.isMet;
    if (isMet === undefined) throw new Error('lesson 2 has a challenge');
    const slow = slide(0.5, 1, 4);
    expect(isMet(snapshotOf(slow.state, 1))).toBe(true);
    const jump = slide(0.5, 1, 0);
    expect(isMet(snapshotOf(jump.state, 1))).toBe(false);
  });
});
