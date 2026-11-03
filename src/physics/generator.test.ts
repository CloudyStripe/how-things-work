import { describe, expect, it } from 'vitest';
import {
  crankAngle,
  generatorFrequency,
  generatorPeakEmf,
  rotatingMagnetDipole,
  type RotatingMagnet,
} from './generator';
import { dipoleFluxLinkage, inducedEmf } from './induction';
import { coilAt, relativeError } from './test-fixtures';
import { EAST, length, NORTH, scale, sub, UP, vec3 } from './vector';

const COIL = coilAt(0, 200);
const ROTOR: RotatingMagnet = {
  position: vec3(0.06, 0, 0),
  shaftAxis: UP,
  referenceDirection: EAST,
  moment: 0.5,
};

describe('rotatingMagnetDipole', () => {
  it('starts along the reference direction and turns about the shaft', () => {
    const start = rotatingMagnetDipole(ROTOR, 0).moment;
    expect(length(sub(start, scale(EAST, 0.5)))).toBeLessThan(1e-15);
    const quarterTurn = rotatingMagnetDipole(ROTOR, Math.PI / 2).moment;
    expect(length(sub(quarterTurn, scale(NORTH, 0.5)))).toBeLessThan(1e-15);
  });
});

describe('crank generator', () => {
  it('produces a sine wave with the closed-form peak', () => {
    const rotationsPerSecond = 3;
    const dt = 1e-5;
    const peak = generatorPeakEmf(COIL, ROTOR, rotationsPerSecond);
    const linkageAt = (time: number) =>
      dipoleFluxLinkage(COIL, rotatingMagnetDipole(ROTOR, crankAngle(rotationsPerSecond, time)));

    for (const angle of [0.2, 1, 2.5, 4, 5.5]) {
      const time = angle / (2 * Math.PI * rotationsPerSecond);
      const emf = inducedEmf(linkageAt(time - dt / 2), linkageAt(time + dt / 2), dt);
      expect(Math.abs(emf - peak * Math.sin(angle)) / peak).toBeLessThan(1e-6);
    }
  });

  it('peaks in proportion to turns and to magnet strength', () => {
    const base = generatorPeakEmf(COIL, ROTOR, 2);
    expect(relativeError(generatorPeakEmf(coilAt(0, 400), ROTOR, 2), 2 * base)).toBeLessThan(1e-14);
    expect(
      relativeError(generatorPeakEmf(COIL, { ...ROTOR, moment: 1 }, 2), 2 * base),
    ).toBeLessThan(1e-14);
  });

  it('alternates once per rotation, whichever way the crank turns', () => {
    expect(generatorFrequency(3)).toBe(3);
    expect(generatorFrequency(-3)).toBe(3);
  });
});
