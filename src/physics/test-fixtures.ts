// Shared bench setups for the physics tests: realistic classroom values, not scene content.
// The scenes define their own parameters from Phase 4 on.

import { circuitCurrent } from './circuits';
import { coilResistance, type Coil } from './coil';
import { coaxialFluxLinkage, inducedEmf } from './induction';
import { barMagnetWinding, type BarMagnet } from './magnet';
import { EAST, scale, vec3 } from './vector';

/** The induction lessons' coil: 2 cm radius, 5 cm long, fine copper wire, lying along x. */
export function coilAt(x: number, turns = 100): Coil {
  return {
    center: vec3(x, 0, 0),
    axis: EAST,
    radius: 0.02,
    length: 0.05,
    turns,
    wireDiameter: 0.3e-3,
  };
}

/** A 6 cm ceramic bar magnet (about 0.36 T remanence) on the coil's axis, N pole toward +x. */
export function magnetAt(x: number, flipped = false): BarMagnet {
  return {
    center: vec3(x, 0, 0),
    axis: flipped ? scale(EAST, -1) : EAST,
    radius: 0.0075,
    length: 0.06,
    moment: 3,
  };
}

/** Internal resistance (Ω) of a classroom centre-zero galvanometer. */
export const GALVANOMETER_RESISTANCE = 50;

export interface AxialMotion {
  /** Magnet centre (m along x) at each sample. */
  readonly magnetPositions: readonly number[];
  /** Coil centre (m along x) at each sample. */
  readonly coilPositions: readonly number[];
  readonly dt: number;
  readonly turns?: number;
  readonly flipped?: boolean;
}

export interface AxialMotionResult {
  /** Average emf (V) across each step. */
  readonly emfs: number[];
  /** Average galvanometer current (A) across each step. */
  readonly currents: number[];
}

/** Runs a magnet and coil along their shared axis and records the induced emf and current. */
export function simulateAxialMotion(motion: AxialMotion): AxialMotionResult {
  const { magnetPositions, coilPositions, dt, turns = 100, flipped = false } = motion;
  if (magnetPositions.length !== coilPositions.length) {
    throw new RangeError('Magnet and coil need the same number of samples');
  }
  const linkages = magnetPositions.map((magnetX, i) => {
    const coil = coilAt(coilPositions[i] ?? 0, turns);
    return coaxialFluxLinkage(barMagnetWinding(magnetAt(magnetX, flipped)), coil);
  });
  const resistance = coilResistance(coilAt(0, turns)) + GALVANOMETER_RESISTANCE;

  const emfs: number[] = [];
  for (let i = 1; i < linkages.length; i++) {
    emfs.push(inducedEmf(linkages[i - 1] ?? 0, linkages[i] ?? 0, dt));
  }
  return { emfs, currents: emfs.map((emf) => circuitCurrent(emf, resistance)) };
}

/** |actual - expected| / |expected|. */
export function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

/** Evenly spaced positions from `start` to `end` inclusive, at a steady speed. */
export function steadyMove(start: number, end: number, steps: number): number[] {
  return Array.from({ length: steps + 1 }, (_, i) => start + ((end - start) * i) / steps);
}

/** The same position repeated, for something held still. */
export function holdAt(position: number, steps: number): number[] {
  return Array.from({ length: steps + 1 }, () => position);
}
