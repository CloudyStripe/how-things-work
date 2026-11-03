import { describe, expect, it } from 'vitest';
import { circuitCurrent } from './circuits';
import { coilResistance, coilWinding } from './coil';
import { MU_0 } from './constants';
import {
  axialForceOnSource,
  coaxialFluxLinkage,
  coaxialFluxLinkageGradient,
  dipoleFluxLinkage,
  inducedEmf,
} from './induction';
import { barMagnetWinding, type BarMagnet } from './magnet';
import { coilAt, GALVANOMETER_RESISTANCE, magnetAt, relativeError } from './test-fixtures';
import { EAST, scale, UP, vec3 } from './vector';
import { windingAxialField } from './winding';

const RESISTANCE = coilResistance(coilAt(0)) + GALVANOMETER_RESISTANCE;

/** Flux linkage through the coil at coilX from the bar magnet at magnetX. */
function linkage(magnetX: number, { coilX = 0, turns = 100, flipped = false } = {}): number {
  return coaxialFluxLinkage(barMagnetWinding(magnetAt(magnetX, flipped)), coilAt(coilX, turns));
}

describe('coaxialFluxLinkage', () => {
  it('is proportional to turns and to magnet strength', () => {
    expect(linkage(-0.05, { turns: 200 })).toBe(2 * linkage(-0.05));
    const stronger = { ...magnetAt(-0.05), moment: 6 };
    const strongerLinkage = coaxialFluxLinkage(barMagnetWinding(stronger), coilAt(0));
    expect(relativeError(strongerLinkage, 2 * linkage(-0.05))).toBeLessThan(1e-14);
  });

  it('peaks with the magnet centred in the coil and is the same on either side', () => {
    expect(linkage(0)).toBeGreaterThan(linkage(-0.02));
    expect(linkage(-0.02)).toBeGreaterThan(linkage(-0.06));
    expect(relativeError(linkage(0.06), linkage(-0.06))).toBeLessThan(1e-12);
  });

  it('matches the closed form for a thin magnet (a line of dipoles)', () => {
    const coil = coilAt(0);
    const thin: BarMagnet = { ...magnetAt(0), radius: 5e-5 };
    const a = coil.radius;
    const l = coil.length;
    const L = thin.length;
    const F = (u: number) => Math.hypot(a, u);
    for (const magnetX of [-0.2, -0.06, -0.03, 0]) {
      const d = -magnetX;
      const closedForm =
        ((MU_0 * thin.moment * coil.turns) / (2 * l * L)) *
        (F(d + l / 2 + L / 2) - F(d - l / 2 + L / 2) - F(d + l / 2 - L / 2) + F(d - l / 2 - L / 2));
      const magnet = { ...thin, center: vec3(magnetX, 0, 0) };
      expect(
        relativeError(coaxialFluxLinkage(barMagnetWinding(magnet), coil), closedForm),
      ).toBeLessThan(1e-5);
    }
  });

  it('agrees with the point-dipole flux for a small magnet far away', () => {
    const small: BarMagnet = {
      center: vec3(-0.2, 0, 0),
      axis: EAST,
      radius: 0.004,
      length: 0.01,
      moment: 0.5,
    };
    const coil = coilAt(0);
    const exact = coaxialFluxLinkage(barMagnetWinding(small), coil);
    const dipole = dipoleFluxLinkage(coil, { position: small.center, moment: scale(EAST, 0.5) });
    expect(relativeError(dipole, exact)).toBeLessThan(1e-2);
  });

  it('rejects a source off the coil axis or too wide to fit inside the coil', () => {
    const coil = coilAt(0);
    const offAxis = { ...magnetAt(-0.2), center: vec3(-0.2, 0.01, 0) };
    const tilted = { ...magnetAt(-0.2), axis: UP };
    const tooWide = { ...magnetAt(0), radius: 0.025 };
    expect(() => coaxialFluxLinkage(barMagnetWinding(offAxis), coil)).toThrow(RangeError);
    expect(() => coaxialFluxLinkage(barMagnetWinding(tilted), coil)).toThrow(RangeError);
    expect(() => coaxialFluxLinkage(barMagnetWinding(tooWide), coil)).toThrow(RangeError);
  });
});

describe('inducedEmf', () => {
  it('is negative while the flux linkage rises', () => {
    expect(inducedEmf(0.001, 0.002, 0.01)).toBeCloseTo(-0.1, 15);
  });

  it('is exactly +0 when the flux linkage does not change', () => {
    expect(Object.is(inducedEmf(0.003, 0.003, 1 / 60), 0)).toBe(true);
  });

  it('rejects a time step that is not positive', () => {
    expect(() => inducedEmf(0, 1, 0)).toThrow(RangeError);
  });
});

describe("Lenz's law", () => {
  function inducedCurrent(fromX: number, toX: number, dt: number, flipped = false): number {
    const emf = inducedEmf(linkage(fromX, { flipped }), linkage(toX, { flipped }), dt);
    return circuitCurrent(emf, RESISTANCE);
  }

  it("makes the coil's own field oppose the change in flux", () => {
    for (const flipped of [false, true]) {
      for (const [fromX, toX] of [
        [-0.1, -0.08],
        [-0.08, -0.1],
      ] as const) {
        const change = linkage(toX, { flipped }) - linkage(fromX, { flipped });
        const current = inducedCurrent(fromX, toX, 1 / 60, flipped);
        const inducedField = windingAxialField(coilWinding(coilAt(0), current), 0);
        expect(Math.sign(inducedField)).toBe(-Math.sign(change));
      }
    }
  });

  it('drags on the magnet against its motion, whichever way it moves', () => {
    const dt = 1e-3;
    for (const flipped of [false, true]) {
      for (const velocity of [0.5, -0.5]) {
        const x = -0.06;
        const current = inducedCurrent(x, x + velocity * dt, dt, flipped);
        const midpoint = magnetAt(x + (velocity * dt) / 2, flipped);
        const gradient = coaxialFluxLinkageGradient(barMagnetWinding(midpoint), coilAt(0));
        expect(Math.sign(axialForceOnSource(current, gradient))).toBe(-Math.sign(velocity));
      }
    }
  });

  it('turns the work done against the drag into exactly that much heat in the circuit', () => {
    // Energy conservation: the power pushing the magnet against the drag equals I² R.
    const x = -0.06;
    const velocity = 0.5;
    const dt = 1e-6;
    const current = inducedCurrent(x - (velocity * dt) / 2, x + (velocity * dt) / 2, dt);
    const gradient = coaxialFluxLinkageGradient(barMagnetWinding(magnetAt(x)), coilAt(0));
    const force = axialForceOnSource(current, gradient);
    expect(relativeError(-force * velocity, current ** 2 * RESISTANCE)).toBeLessThan(1e-6);
  });

  it('exerts no force on a magnet centred in the coil', () => {
    const centred = coaxialFluxLinkageGradient(barMagnetWinding(magnetAt(0)), coilAt(0));
    const offCentre = coaxialFluxLinkageGradient(barMagnetWinding(magnetAt(-0.03)), coilAt(0));
    expect(Math.abs(centred)).toBeLessThan(1e-6 * Math.abs(offCentre));
  });
});
