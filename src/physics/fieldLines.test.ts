import { describe, expect, it } from 'vitest';
import { earthField } from './earth';
import { netField, NO_SOURCES } from './field';
import { traceHorizontalFieldLine } from './fieldLines';
import { barMagnetField } from './magnet';
import { magnetAt } from './test-fixtures';
import { length, sub, vec3, type Vec3 } from './vector';

const NEVER = () => false;

describe('traceHorizontalFieldLine', () => {
  it('runs straight north in Earth’s field alone, and south against it', () => {
    const field = () => earthField();
    const north = traceHorizontalFieldLine(field, vec3(0, 0, 0), 1, {
      step: 0.01,
      maxSteps: 10,
      stop: NEVER,
    });
    const end = north.at(-1) ?? vec3(0, 0, 0);
    expect(end.x).toBeCloseTo(0, 9);
    expect(end.z).toBeCloseTo(-0.1, 9);
    const south = traceHorizontalFieldLine(field, vec3(0, 0, 0), -1, {
      step: 0.01,
      maxSteps: 10,
      stop: NEVER,
    });
    expect(south.at(-1)?.z).toBeCloseTo(0.1, 9);
  });

  it('stays level, at the height it started', () => {
    const magnet = magnetAt(0);
    const line = traceHorizontalFieldLine(
      (point) => barMagnetField(magnet, point),
      vec3(0.035, 0.012, 0.002),
      1,
      { step: 0.002, maxSteps: 200, stop: NEVER },
    );
    expect(line.every((point) => point.y === 0.012)).toBe(true);
  });

  it('leaves a magnet’s north pole and comes round to its south pole', () => {
    // A 6 cm magnet along x, N pole at +3 cm. Start just outside the N end, a little off axis.
    const magnet = magnetAt(0);
    const southPole = vec3(-0.03, 0, 0);
    const nearSouth = (point: Vec3) => length(sub(point, southPole)) < 0.004;
    const line = traceHorizontalFieldLine(
      (point) => barMagnetField(magnet, point),
      vec3(0.033, 0, 0.003),
      1,
      { step: 0.001, maxSteps: 2000, stop: nearSouth },
    );
    const end = line.at(-1) ?? vec3(0, 0, 0);
    expect(nearSouth(end)).toBe(true);
    // It bows out to the side it started on and never crosses the magnet.
    expect(Math.min(...line.map((point) => point.z))).toBeGreaterThan(0);
  });

  it('follows the net field: a magnet and Earth together', () => {
    const sources = { ...NO_SOURCES, magnets: [magnetAt(0)], earth: true };
    // Far from the magnet the line runs north, as Earth's field does.
    const line = traceHorizontalFieldLine((point) => netField(sources, point), vec3(1, 0, 0), 1, {
      step: 0.01,
      maxSteps: 5,
      stop: NEVER,
    });
    const end = line.at(-1) ?? vec3(0, 0, 0);
    expect(Math.abs(end.x - 1)).toBeLessThan(0.005);
    expect(end.z).toBeLessThan(-0.04);
  });
});
