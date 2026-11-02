import { describe, expect, it } from 'vitest';
import {
  compassBearing,
  GALVANOMETER,
  stepCompassNeedle,
  stepGalvanometerNeedle,
  type NeedleState,
} from './needles';
import { vec3, ZERO, type Vec3 } from './vector';

const FRAME = 1 / 60;
const AT_REST: NeedleState = { angle: 0, angularVelocity: 0 };

describe('compassBearing', () => {
  it('measures clockwise from north', () => {
    expect(compassBearing(vec3(0, 0, -1e-5))).toBe(0);
    expect(compassBearing(vec3(1e-5, 0, 0))).toBeCloseTo(Math.PI / 2, 15);
    expect(compassBearing(vec3(-1e-5, 0, 0))).toBeCloseTo(-Math.PI / 2, 15);
    expect(compassBearing(vec3(0, 0, 1e-5))).toBeCloseTo(Math.PI, 15);
  });

  it('ignores the vertical part of the field', () => {
    expect(compassBearing(vec3(1e-5, -4e-5, 0))).toBeCloseTo(Math.PI / 2, 15);
  });

  it('has no bearing without a horizontal field', () => {
    expect(compassBearing(ZERO)).toBeNull();
    expect(compassBearing(vec3(0, 5e-5, 0))).toBeNull();
  });
});

describe('stepCompassNeedle', () => {
  function runCompass(state: NeedleState, field: Vec3, seconds: number): NeedleState {
    let next = state;
    for (let frame = 0; frame < seconds / FRAME; frame++)
      next = stepCompassNeedle(next, field, FRAME);
    return next;
  }

  it('settles on the bearing of the field it sits in', () => {
    const settled = runCompass(AT_REST, vec3(25e-6, 0, 0), 10);
    expect(settled.angle).toBeCloseTo(Math.PI / 2, 6);
    expect(Math.abs(settled.angularVelocity)).toBeLessThan(1e-6);
  });

  it('stays where it is with no field', () => {
    expect(runCompass({ angle: 1, angularVelocity: 0 }, ZERO, 2).angle).toBe(1);
  });

  it('swings faster in a stronger field', () => {
    // Released 20° off north; time until it first swings through north.
    function firstSwingThrough(strength: number): number {
      const dt = 1e-4;
      let state: NeedleState = { angle: (20 * Math.PI) / 180, angularVelocity: 0 };
      let time = 0;
      while (state.angle > 0) {
        state = stepCompassNeedle(state, vec3(0, 0, -strength), dt);
        time += dt;
      }
      return time;
    }
    const ratio = firstSwingThrough(25e-6) / firstSwingThrough(100e-6);
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);
  });
});

describe('stepGalvanometerNeedle', () => {
  function runGalvanometer(current: number, from: NeedleState = AT_REST): NeedleState {
    let state = from;
    for (let frame = 0; frame < 600; frame++) state = stepGalvanometerNeedle(state, current, FRAME);
    return state;
  }

  it('settles at a deflection proportional to the current, either side of zero', () => {
    const { fullScaleAngle, fullScaleCurrent } = GALVANOMETER;
    expect(runGalvanometer(fullScaleCurrent / 2).angle).toBeCloseTo(fullScaleAngle / 2, 9);
    expect(runGalvanometer(-fullScaleCurrent / 4).angle).toBeCloseTo(-fullScaleAngle / 4, 9);
    expect(runGalvanometer(0, { angle: 0.5, angularVelocity: 0 }).angle).toBeCloseTo(0, 9);
  });

  it('overshoots a little before settling, like a real meter', () => {
    const target = GALVANOMETER.fullScaleAngle / 2;
    let state = AT_REST;
    let furthest = 0;
    for (let step = 0; step < 2000; step++) {
      state = stepGalvanometerNeedle(state, GALVANOMETER.fullScaleCurrent / 2, 1e-3);
      furthest = Math.max(furthest, state.angle);
    }
    const overshoot = (furthest - target) / target;
    expect(overshoot).toBeGreaterThan(0.05);
    expect(overshoot).toBeLessThan(0.15);
  });

  it('rests against its end stop when overdriven', () => {
    expect(runGalvanometer(10 * GALVANOMETER.fullScaleCurrent).angle).toBeCloseTo(
      1.1 * GALVANOMETER.fullScaleAngle,
      12,
    );
  });
});
