import { describe, expect, it } from 'vitest';
import { MU_0 } from './constants';
import { relativeError } from './test-fixtures';
import { dot, EAST, length, NORTH, UP, vec3, ZERO } from './vector';
import { straightWireField, type StraightWire } from './wire';

const WIRE: StraightWire = { point: ZERO, direction: UP, radius: 0.5e-3, current: 5 };

describe('straightWireField', () => {
  it('has magnitude μ0 I / (2π r)', () => {
    const field = straightWireField(WIRE, vec3(0.02, 0, 0));
    expect(relativeError(length(field), (MU_0 * 5) / (2 * Math.PI * 0.02))).toBeLessThan(1e-14);
  });

  it('circles the wire by the right-hand rule', () => {
    // Current flowing up: seen from above, the field runs counterclockwise.
    const eastSide = straightWireField(WIRE, vec3(0.02, 0, 0));
    expect(dot(eastSide, NORTH)).toBeCloseTo(length(eastSide), 18);
    const northSide = straightWireField(WIRE, vec3(0, 0, -0.02));
    expect(dot(northSide, EAST)).toBeCloseTo(-length(northSide), 18);
  });

  it('has no part along the wire or pointing toward it', () => {
    const point = vec3(0.01, 0.3, 0.02);
    const field = straightWireField(WIRE, point);
    expect(dot(field, UP)).toBeCloseTo(0, 18);
    expect(dot(field, vec3(0.01, 0, 0.02))).toBeCloseTo(0, 18);
  });

  it('reverses with the current', () => {
    const point = vec3(0.02, 0, 0.01);
    const forward = straightWireField(WIRE, point);
    const reversed = straightWireField({ ...WIRE, current: -5 }, point);
    expect(reversed.x).toBeCloseTo(-forward.x, 18);
    expect(reversed.z).toBeCloseTo(-forward.z, 18);
  });

  it('falls linearly to zero inside the copper instead of diverging', () => {
    const surface = length(straightWireField(WIRE, vec3(WIRE.radius, 0, 0)));
    const halfway = length(straightWireField(WIRE, vec3(WIRE.radius / 2, 0, 0)));
    expect(relativeError(halfway, surface / 2)).toBeLessThan(1e-14);
    expect(straightWireField(WIRE, ZERO)).toEqual(ZERO);
  });
});
