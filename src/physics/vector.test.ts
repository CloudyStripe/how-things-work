import { describe, expect, it } from 'vitest';
import { cross, EAST, normalize, NORTH, UP, vec3, ZERO } from './vector';

describe('physics frame', () => {
  it('is right-handed in geographic terms: east × north = up', () => {
    const product = cross(EAST, NORTH);
    expect(product.y).toBe(UP.y);
    expect(product.x).toBeCloseTo(0, 15);
    expect(product.z).toBeCloseTo(0, 15);
  });

  it('puts south along +z, matching three.js world space', () => {
    expect(cross(EAST, UP)).toEqual(vec3(0, 0, 1));
  });

  it('refuses to normalize a zero vector', () => {
    expect(() => normalize(ZERO)).toThrow(RangeError);
  });
});
