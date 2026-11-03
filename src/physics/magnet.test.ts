import { describe, expect, it } from 'vitest';
import { barMagnetField, pointDipoleField, type BarMagnet } from './magnet';
import { relativeError } from './test-fixtures';
import { dot, EAST, length, scale, sub, UP, vec3, ZERO } from './vector';

const MAGNET: BarMagnet = { center: ZERO, axis: EAST, radius: 0.0075, length: 0.06, moment: 3 };

describe('barMagnetField', () => {
  it('falls off as 1 / distance³ far away', () => {
    const near = barMagnetField(MAGNET, vec3(2, 0, 0)).x;
    const far = barMagnetField(MAGNET, vec3(4, 0, 0)).x;
    expect(relativeError(far, near / 8)).toBeLessThan(1e-3);
  });

  it('matches a point dipole of the same moment far away', () => {
    const dipole = { position: ZERO, moment: scale(EAST, MAGNET.moment) };
    for (const direction of [EAST, UP, vec3(0.6, 0.8, 0), vec3(-0.8, 0, 0.6)]) {
      const point = scale(direction, 1);
      const exact = barMagnetField(MAGNET, point);
      const expected = pointDipoleField(dipole, point);
      expect(length(sub(exact, expected)) / length(expected)).toBeLessThan(1e-2);
    }
  });

  it('runs from S to N inside the magnet and back from N to S outside it', () => {
    expect(barMagnetField(MAGNET, ZERO).x).toBeGreaterThan(0);
    expect(barMagnetField(MAGNET, vec3(0.04, 0, 0)).x).toBeGreaterThan(0); // beyond the N pole
    expect(barMagnetField(MAGNET, vec3(0, 0.03, 0)).x).toBeLessThan(0); // beside the middle
  });

  it('reverses everywhere when the magnet is flipped', () => {
    const flipped = { ...MAGNET, axis: scale(EAST, -1) };
    for (const point of [vec3(0.05, 0.01, 0), vec3(0, 0.03, 0.01), vec3(-0.1, 0, 0)]) {
      const original = barMagnetField(MAGNET, point);
      const reversed = barMagnetField(flipped, point);
      expect(length(sub(reversed, scale(original, -1)))).toBeLessThan(1e-12 * length(original));
    }
  });
});

describe('pointDipoleField', () => {
  it('is twice as strong along the axis as beside it at the same distance', () => {
    const dipole = { position: ZERO, moment: scale(EAST, 1) };
    const along = pointDipoleField(dipole, vec3(1, 0, 0));
    const beside = pointDipoleField(dipole, vec3(0, 1, 0));
    expect(relativeError(dot(along, EAST), -2 * dot(beside, EAST))).toBeLessThan(1e-14);
  });
});
