import { describe, expect, it } from 'vitest';
import {
  coilCenterField,
  coilInductance,
  coilResistance,
  coilWinding,
  electromagnetWinding,
  ironCoreGain,
  SOFT_IRON_CORE,
} from './coil';
import { MU_0 } from './constants';
import { coilAt, relativeError } from './test-fixtures';
import { EAST, scale } from './vector';
import { windingAxialField, windingField } from './winding';

describe('coil field', () => {
  it('matches the closed-form axial field on the axis, inside and outside', () => {
    const winding = coilWinding(coilAt(0, 200), 3);
    for (const x of [0, 0.01, 0.024, 0.04, 0.1]) {
      const field = windingField(winding, scale(EAST, x));
      expect(relativeError(field.x, windingAxialField(winding, x))).toBeLessThan(1e-6);
    }
  });

  it('is the spec formula B = μ0 n I inside a long solenoid', () => {
    const longCoil = { ...coilAt(0, 1000), length: 1, radius: 0.01 };
    const n = 1000 / 1;
    expect(relativeError(coilCenterField(longCoil, 2), MU_0 * n * 2)).toBeLessThan(1e-3);
  });

  it('grows in proportion to turns and current, and reverses with current', () => {
    const base = coilCenterField(coilAt(0, 50), 1);
    expect(relativeError(coilCenterField(coilAt(0, 200), 1), 4 * base)).toBeLessThan(1e-14);
    expect(relativeError(coilCenterField(coilAt(0, 50), 3), 3 * base)).toBeLessThan(1e-14);
    expect(coilCenterField(coilAt(0, 50), -1)).toBe(-base);
  });
});

describe('iron core', () => {
  it('multiplies the field by its effective permeability below saturation', () => {
    const coil = coilAt(0, 200);
    const cored = windingAxialField(electromagnetWinding(coil, 0.5, SOFT_IRON_CORE), 0);
    expect(relativeError(cored, 30 * coilCenterField(coil, 0.5))).toBeLessThan(1e-14);
  });

  it('caps the field at saturation', () => {
    const coil = coilAt(0, 200);
    const cored = windingAxialField(electromagnetWinding(coil, 20, SOFT_IRON_CORE), 0);
    expect(relativeError(cored, SOFT_IRON_CORE.saturationField)).toBeLessThan(1e-14);
    expect(ironCoreGain(0.2)).toBeCloseTo(8, 14);
  });

  it('leaves the field alone when there is no core', () => {
    const coil = coilAt(0, 200);
    expect(electromagnetWinding(coil, 2, null)).toEqual(coilWinding(coil, 2));
  });
});

describe('coil resistance and inductance', () => {
  it('computes copper resistance from the wire length and gauge', () => {
    // 100 turns of 2 cm radius is 12.6 m of 0.3 mm wire: about 3 Ω.
    expect(coilResistance(coilAt(0, 100))).toBeCloseTo(2.9867, 4);
    expect(coilResistance(coilAt(0, 200))).toBeCloseTo(2 * coilResistance(coilAt(0, 100)), 12);
    const thicker = { ...coilAt(0, 100), wireDiameter: 0.6e-3 };
    expect(coilResistance(thicker)).toBeCloseTo(coilResistance(coilAt(0, 100)) / 4, 12);
  });

  it('approaches the long-solenoid inductance μ0 N² A / ℓ for a long coil', () => {
    const longCoil = { ...coilAt(0, 1000), length: 2, radius: 0.01 };
    const ideal = (MU_0 * 1000 ** 2 * Math.PI * 0.01 ** 2) / 2;
    expect(relativeError(coilInductance(longCoil), ideal)).toBeLessThan(5e-3);
  });
});
