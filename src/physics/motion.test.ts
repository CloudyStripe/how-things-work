import { describe, expect, it } from 'vitest';
import { stepSlidingBody, type FrictionParams, type SlidingBody } from './motion';
import { EAST, scale, vec3, ZERO } from './vector';

const CART: FrictionParams = { mass: 0.1, staticFriction: 0.02, kineticFriction: 0.015 };
const AT_REST: SlidingBody = { position: ZERO, velocity: ZERO };

function run(state: SlidingBody, force: (s: SlidingBody) => number, seconds: number) {
  let current = state;
  for (let t = 0; t < seconds; t += 1 / 60) {
    current = stepSlidingBody(current, scale(EAST, force(current)), 1 / 60, CART);
  }
  return current;
}

describe('stepSlidingBody', () => {
  it('stays put while the push is below static friction', () => {
    const after = run(AT_REST, () => 0.019, 2);
    expect(after.position).toEqual(ZERO);
    expect(after.velocity).toEqual(ZERO);
  });

  it('moves once the push beats static friction, accelerating by the net force', () => {
    const after = run(AT_REST, () => 0.05, 1);
    // Net force 0.05 - 0.015 = 0.035 N on 0.1 kg: 0.35 m/s after a second.
    expect(after.velocity.x).toBeCloseTo(0.35, 2);
    expect(after.position.x).toBeGreaterThan(0);
  });

  it('slows to a stop under friction alone and never rolls back', () => {
    const rolling: SlidingBody = { position: ZERO, velocity: vec3(0.3, 0, 0) };
    let state = rolling;
    let previousX = 0;
    for (let t = 0; t < 4; t += 1 / 60) {
      state = stepSlidingBody(state, ZERO, 1 / 60, CART);
      expect(state.position.x).toBeGreaterThanOrEqual(previousX);
      expect(state.velocity.x).toBeGreaterThanOrEqual(0);
      previousX = state.position.x;
    }
    expect(state.velocity).toEqual(ZERO);
    // v² / (2 a): 0.09 / (2 × 0.15) = 0.3 m.
    expect(state.position.x).toBeCloseTo(0.3, 2);
  });

  it('gives the same motion whatever the frame rate', () => {
    const at60 = run(AT_REST, () => 0.05, 1);
    let at20 = AT_REST;
    for (let t = 0; t < 1 - 1e-9; t += 1 / 20) {
      at20 = stepSlidingBody(at20, scale(EAST, 0.05), 1 / 20, CART);
    }
    expect(at20.position.x).toBeCloseTo(at60.position.x, 3);
  });
});
