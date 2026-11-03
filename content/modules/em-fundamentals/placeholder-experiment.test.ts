import { describe, expect, it } from 'vitest';
import {
  CURRENT_LEVELS,
  placeholderWireCompass,
  type CurrentLevel,
  type PlaceholderControls,
  type PlaceholderSnapshot,
  type PlaceholderState,
} from '@/models/placeholder-wire-compass/definition';
import { placeholderExperiment } from './placeholder-experiment';

// The challenge, "point the compass closer to east than to north", with the real physics.
// The compass sits 2 cm north of the wire (10 µT per amp) in Earth's 25 µT horizontal field.
// Reversed, medium (2 A) settles at 38.7° and high (4 A) at 58.0°.

const FRAME = 1 / 60;
const model = placeholderWireCompass;
const { isMet } = placeholderExperiment.steps.challenge;

function controls(
  level: CurrentLevel,
  reversed: boolean,
  switchClosed = true,
): PlaceholderControls {
  return { switchClosed, level, reversed };
}

function degrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Runs the model frame by frame from a settled start, checking the challenge every frame. */
function run(start: PlaceholderControls, target: PlaceholderControls, seconds = 10) {
  let state: PlaceholderState = model.createState(start);
  let solvedAt: number | null = null;
  let furthest = degrees(state.needle.angle);
  for (let frame = 1; frame <= Math.round(seconds / FRAME); frame++) {
    state = model.step({ state, controls: target, time: frame * FRAME }, FRAME);
    furthest = Math.max(furthest, degrees(state.needle.angle));
    const snapshot: PlaceholderSnapshot = { state, controls: target, time: frame * FRAME };
    if (solvedAt === null && isMet(snapshot)) solvedAt = frame * FRAME;
  }
  return { solvedAt, furthest };
}

const AT_REST = controls('low', false, false);

describe('placeholder challenge: closer to east than to north', () => {
  it('is solved by high current reversed, and by nothing else', () => {
    for (const level of Object.keys(CURRENT_LEVELS) as CurrentLevel[]) {
      for (const reversed of [false, true]) {
        for (const switchClosed of [false, true]) {
          const { solvedAt } = run(AT_REST, controls(level, reversed, switchClosed));
          const expected = level === 'high' && reversed && switchClosed;
          expect(solvedAt !== null, `${level}, reversed ${reversed}, closed ${switchClosed}`).toBe(
            expected,
          );
        }
      }
    }
  });

  it('is solved within a few seconds, once the needle settles', () => {
    const { solvedAt } = run(AT_REST, controls('high', true));
    expect(solvedAt).not.toBeNull();
    expect(solvedAt).toBeGreaterThan(0.5);
    expect(solvedAt).toBeLessThan(5);
  });

  it('is never solved at medium reversed, even while the needle overshoots past 45°', () => {
    // From rest pointing north, and from the opposite deflection (the biggest swing).
    for (const start of [AT_REST, controls('medium', false)]) {
      const { solvedAt, furthest } = run(start, controls('medium', true));
      expect(furthest).toBeGreaterThan(45);
      expect(solvedAt).toBeNull();
    }
  });

  it('leaves a clear margin either side of 45°', () => {
    // Guards the boundary: if Earth's field or the levels change, medium must not drift toward
    // 45° (at 20 µT horizontal it would sit exactly on it).
    const settled = (level: CurrentLevel) =>
      degrees(model.createState(controls(level, true)).fieldBearing ?? 0);
    expect(settled('medium')).toBeCloseTo(38.66, 1);
    expect(settled('medium')).toBeLessThan(42);
    expect(settled('high')).toBeCloseTo(57.99, 1);
    expect(settled('high')).toBeGreaterThan(48);
  });
});
