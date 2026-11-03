import { describe, expect, it } from 'vitest';
import { coilCenterField } from './coil';
import { inducedEmf } from './induction';
import { currentLoopField } from './loop';
import { pointDipoleField } from './magnet';
import { coilAt, relativeError } from './test-fixtures';
import { EAST, length, UP, vec3, ZERO } from './vector';
import { straightWireField } from './wire';

// Absolute magnitudes against textbook numbers. The expected values are written out as plain
// numbers, not computed from MU_0, so a wrong constant or unit cannot cancel out.

describe('Known values', () => {
  it('a long straight wire carrying 1 A gives 20 µT at 1 cm', () => {
    const wire = { point: ZERO, direction: UP, radius: 0.5e-3, current: 1 };
    expect(relativeError(length(straightWireField(wire, vec3(0.01, 0, 0))), 20e-6)).toBeLessThan(
      1e-6,
    );
  });

  it('a 10 cm loop carrying 1 A gives 6.283 µT at its centre', () => {
    const loop = { center: ZERO, axis: UP, radius: 0.1, current: 1 };
    expect(relativeError(currentLoopField(loop, ZERO).y, 6.2832e-6)).toBeLessThan(1e-5);
  });

  it('a long solenoid of 1000 turns per metre carrying 1 A gives 1.257 mT inside', () => {
    const solenoid = { ...coilAt(0, 1000), length: 1, radius: 0.01 };
    expect(relativeError(coilCenterField(solenoid, 1), 1.2566e-3)).toBeLessThan(1e-3);
  });

  it('a 1 A·m² dipole gives 0.2 µT on its axis and 0.1 µT beside it, 1 m away', () => {
    const dipole = { position: ZERO, moment: EAST };
    expect(relativeError(pointDipoleField(dipole, vec3(1, 0, 0)).x, 0.2e-6)).toBeLessThan(1e-6);
    expect(relativeError(pointDipoleField(dipole, vec3(0, 1, 0)).x, -0.1e-6)).toBeLessThan(1e-6);
  });

  it('100 turns whose flux rises by 1 mWb in 0.1 s give 1 V', () => {
    const linkageChange = 100 * 1e-3;
    expect(inducedEmf(0, linkageChange, 0.1)).toBeCloseTo(-1, 12);
  });
});
