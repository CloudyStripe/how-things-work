import { describe, expect, it } from 'vitest';
import { earthField } from './earth';
import { netField, NO_SOURCES } from './field';
import { filingAxis, IRON_FILING, turnFiling } from './filings';
import { compassBearing } from './needles';
import { sampledPlaneField } from './sampling';
import { softIronForce } from './ferromagnet';
import { barMagnetField } from './magnet';
import { magnetAt } from './test-fixtures';
import { length, vec3 } from './vector';

/** The glass in lesson 3 sits about 12 mm above the axis of the magnet under it. */
const GLASS = 0.0125;

describe('iron filings', () => {
  it('line up with the field a compass would show, either way round', () => {
    const field = barMagnetField(magnetAt(0), vec3(0.01, GLASS, 0.02));
    const axis = filingAxis(field);
    expect(axis).toBe(compassBearing(field));
    // Starting nearly the opposite way, a filing turns the short way: its two ends are alike.
    const start = (axis ?? 0) + Math.PI - 0.3;
    const halfway = turnFiling(start, axis, IRON_FILING.turnTime);
    expect(sameLine(halfway, start)).toBeLessThan(0.3);
    expect(sameLine(turnFiling(start, axis, 1), axis ?? 0)).toBeLessThan(1e-3);
  });

  it('turn into line within a fraction of a second, without overshooting', () => {
    const offsets = [0, 0.05, 0.1, 0.2, 0.4].map((time) => turnFiling(1, 0, time));
    expect(offsets[0]).toBe(1);
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeLessThan(offsets[i - 1] ?? 0);
      expect(offsets[i]).toBeGreaterThan(0);
    }
    expect(offsets.at(-1)).toBeLessThan(0.01);
  });

  it('do not line up in Earth’s field alone: it is too weak to turn them', () => {
    expect(filingAxis(earthField())).toBeNull();
  });

  it('feel the magnet across most of a sheet of glass, but not far out', () => {
    const magnet = magnetAt(0);
    expect(filingAxis(barMagnetField(magnet, vec3(0, GLASS, 0.04)))).not.toBeNull();
    expect(filingAxis(barMagnetField(magnet, vec3(0, GLASS, 0.09)))).toBeNull();
  });

  it('slide to a pole only from close by', () => {
    const magnet = magnetAt(0);
    const fieldAt = (point: Parameters<typeof barMagnetField>[1]) => barMagnetField(magnet, point);
    const pull = (x: number, z: number) => {
      const force = softIronForce(IRON_FILING.body, fieldAt, vec3(x, GLASS, z));
      return Math.hypot(force.x, force.z);
    };
    // Beside the north pole the pull beats friction; a few centimetres out it does not.
    expect(pull(0.035, 0.005)).toBeGreaterThan(IRON_FILING.friction.staticFriction);
    expect(pull(0.03, 0.03)).toBeLessThan(IRON_FILING.friction.staticFriction);
    expect(pull(0, 0.02)).toBeLessThan(IRON_FILING.friction.staticFriction);
  });
});

/** How far apart two bearings are as lines, ignoring which end is which (rad). */
function sameLine(a: number, b: number): number {
  const difference = Math.abs(a - b) % Math.PI;
  return Math.min(difference, Math.PI - difference);
}

describe('sampledPlaneField', () => {
  it('reads back the field it sampled, between the samples too', () => {
    const sources = { ...NO_SOURCES, magnets: [magnetAt(0)] };
    const exact = (point: Parameters<typeof netField>[1]) => netField(sources, point);
    const sampled = sampledPlaneField(exact, {
      center: vec3(0, GLASS, 0),
      halfWidth: 0.1,
      halfDepth: 0.07,
      spacing: 0.0015,
    });
    for (const [x, z] of [
      [0.012, 0.031],
      [-0.047, -0.0123],
      [0.0801, 0.05],
    ] as const) {
      const point = vec3(x, GLASS, z);
      const error = length(
        vec3(
          sampled(point).x - exact(point).x,
          sampled(point).y - exact(point).y,
          sampled(point).z - exact(point).z,
        ),
      );
      expect(error / length(exact(point))).toBeLessThan(0.02);
    }
  });
});
