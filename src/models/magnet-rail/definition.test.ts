import { describe, expect, it } from 'vitest';
import {
  CART_START,
  CONTACT_DISTANCE,
  leftCartTouching,
  magnetRail,
  rightCartAtEnd,
  rightCartMoved,
  type MagnetRailState,
} from './definition';

const FRAME = 1 / 60;

interface Run {
  readonly state: MagnetRailState;
  /** Gap between the magnets' facing ends when the right cart first moved (m). */
  readonly rightGapWhenMoved: number | null;
}

/** Gap between the facing ends of two magnets whose centres are this far apart (m). */
function faceGap(centreDistance: number): number {
  return centreDistance - 0.06;
}

/** Slides the learner's magnet from one slider position to another over `seconds`, then holds. */
function slide(from: MagnetRailState, start: number, end: number, seconds: number, hold = 1): Run {
  let state = from;
  let rightGapWhenMoved: number | null = null;
  const frames = Math.round(seconds / FRAME);
  for (let frame = 1; frame <= frames + Math.round(hold / FRAME); frame++) {
    const position = start + (end - start) * Math.min(1, frame / Math.max(1, frames));
    state = magnetRail.step({ state, controls: { position }, time: frame * FRAME }, FRAME);
    if (rightGapWhenMoved === null && state.rightCart.position.x !== from.rightCart.position.x) {
      rightGapWhenMoved = faceGap(state.rightCart.position.x - state.holder);
    }
  }
  return { state, rightGapWhenMoved };
}

const START = magnetRail.createState({ position: 0.5 });

describe('magnet rail', () => {
  it('starts with both carts still: the magnets are too far apart to beat friction', () => {
    const { state } = slide(START, 0.5, 0.5, 0, 3);
    expect(state.leftCart.position.x).toBe(-CART_START);
    expect(state.rightCart.position.x).toBe(CART_START);
  });

  it('pushes the right cart away before the magnets touch when you slide toward it', () => {
    const { state, rightGapWhenMoved } = slide(START, 0.5, 1, 4);
    expect(rightCartMoved(state)).toBe(true);
    expect(state.touchedRight).toBe(false);
    // Like poles push from several centimetres away, across an open gap.
    expect(rightGapWhenMoved).toBeGreaterThan(0.04);
    expect(rightGapWhenMoved).toBeLessThan(0.1);
  });

  it('pushes the right cart to the end of the rail without touching it (the challenge)', () => {
    const { state } = slide(START, 0.5, 1, 4);
    expect(rightCartAtEnd(state)).toBe(true);
    expect(state.touchedRight).toBe(false);
  });

  it('cannot push the right cart away fast enough when you jump the magnet at it', () => {
    const { state } = slide(START, 0.5, 1, 0);
    expect(state.touchedRight).toBe(true);
  });

  it('pulls the left cart in to stick against your magnet when you slide toward it', () => {
    // Stop short of where the cart started: it rolls the rest of the way in.
    const { state } = slide(START, 0.5, 0.2, 3);
    expect(state.holder - CONTACT_DISTANCE).toBeGreaterThan(-CART_START);
    expect(leftCartTouching(state)).toBe(true);
  });

  it('keeps the left cart stuck to your magnet as you slide slowly back', () => {
    const stuck = slide(START, 0.5, 0.2, 3).state;
    const { state } = slide(stuck, 0.2, 0.5, 4);
    expect(leftCartTouching(state)).toBe(true);
    expect(state.leftCart.position.x).toBeGreaterThan(-CART_START);
  });

  it('leaves the right cart alone while you work the left one, and the other way round', () => {
    const leftWork = slide(START, 0.5, 0.2, 3).state;
    expect(leftWork.rightCart.position.x).toBe(CART_START);
    const rightWork = slide(START, 0.5, 1, 4).state;
    expect(rightWork.leftCart.position.x).toBe(-CART_START);
  });
});
