import { describe, expect, it } from 'vitest';
import { earthField } from './earth';
import { compassBearing } from './needles';
import { length } from './vector';

describe('earthField', () => {
  const field = earthField();

  it('has a total strength of about 50 µT', () => {
    expect(length(field)).toBeCloseTo(50e-6, 15);
  });

  it('points north at 25 µT horizontally and dips downward', () => {
    expect(field.z).toBeCloseTo(-25e-6, 15);
    expect(field.x).toBe(0);
    expect(field.y).toBeLessThan(0);
  });

  it('turns a compass to bearing zero', () => {
    expect(compassBearing(field)).toBe(0);
  });
});
