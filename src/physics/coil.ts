import { COPPER_RESISTIVITY, MU_0 } from './constants';
import type { Vec3 } from './vector';
import { windingAxialField, type Winding } from './winding';

/** A solenoid wound from copper wire. */
export interface Coil {
  readonly center: Vec3;
  /** Unit vector along the coil. Positive current makes the field inside point along it. */
  readonly axis: Vec3;
  /** Mean radius of the winding (m). */
  readonly radius: number;
  readonly length: number;
  readonly turns: number;
  /** Diameter of the bare copper wire (m). */
  readonly wireDiameter: number;
}

/** The coil carrying a current, as a magnetic source. */
export function coilWinding(coil: Coil, current: number): Winding {
  return {
    center: coil.center,
    axis: coil.axis,
    radius: coil.radius,
    length: coil.length,
    ampereTurns: coil.turns * current,
  };
}

/** DC resistance (Ω) of the coil's copper: resistivity × wire length / wire cross-section. */
export function coilResistance(coil: Coil): number {
  const wireLength = coil.turns * 2 * Math.PI * coil.radius;
  const wireArea = Math.PI * (coil.wireDiameter / 2) ** 2;
  return (COPPER_RESISTIVITY * wireLength) / wireArea;
}

/**
 * Self-inductance (H) of an air-core coil by Wheeler's formula, μ0 π a² N² / (ℓ + 0.9 a).
 * Within about 1% for coils longer than 0.8 of their radius.
 */
export function coilInductance(coil: Coil): number {
  return (MU_0 * Math.PI * coil.radius ** 2 * coil.turns ** 2) / (coil.length + 0.9 * coil.radius);
}

/** Field (T) at the centre of the coil along its axis. For a long coil, B = μ0 n I. */
export function coilCenterField(coil: Coil, current: number): number {
  return windingAxialField(coilWinding(coil, current), 0);
}

export interface IronCore {
  /**
   * How many times the core multiplies the coil's field before saturation. For an open rod
   * this is set by the rod's shape (demagnetization), far below iron's material permeability.
   */
  readonly effectivePermeability: number;
  /** Field (T) at which the iron saturates; the core cannot push the field past it. */
  readonly saturationField: number;
}

/** A soft-iron rod about five times longer than it is wide, as in a classroom electromagnet. */
export const SOFT_IRON_CORE: IronCore = { effectivePermeability: 30, saturationField: 1.6 };

/**
 * Factor by which an iron core multiplies a coil's field, capped so the cored field never
 * exceeds saturation. This is the spec's simplified saturation.
 */
export function ironCoreGain(airCoreField: number, core: IronCore = SOFT_IRON_CORE): number {
  const field = Math.abs(airCoreField);
  if (field === 0) return core.effectivePermeability;
  return Math.min(core.effectivePermeability, core.saturationField / field);
}

/**
 * The coil as a magnetic source, with or without an iron core. A core scales the whole field
 * by its gain: a simplification that treats the magnetized core as having the coil's shape.
 */
export function electromagnetWinding(coil: Coil, current: number, core: IronCore | null): Winding {
  const winding = coilWinding(coil, current);
  if (!core) return winding;
  const gain = ironCoreGain(coilCenterField(coil, current), core);
  return { ...winding, ampereTurns: winding.ampereTurns * gain };
}
