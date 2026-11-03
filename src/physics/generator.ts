import { coilWinding, type Coil } from './coil';
import type { PointDipole } from './magnet';
import { add, cross, dot, length, scale, sub, type Vec3 } from './vector';
import { windingField } from './winding';

/** A bar magnet spun on a shaft by a hand crank, as in lesson 9 (Spin it). */
export interface RotatingMagnet {
  /** Centre of the magnet, on the shaft. */
  readonly position: Vec3;
  /** Unit vector along the shaft. */
  readonly shaftAxis: Vec3;
  /** Unit vector, perpendicular to the shaft, that the N pole points along at angle zero. */
  readonly referenceDirection: Vec3;
  /** Magnetic dipole moment (A·m²). */
  readonly moment: number;
}

/** Shaft angle (rad) after `time` seconds at a steady crank speed in rotations per second. */
export function crankAngle(rotationsPerSecond: number, time: number): number {
  return 2 * Math.PI * rotationsPerSecond * time;
}

/** The spinning magnet at a shaft angle, as a point dipole (it is small beside the coil). */
export function rotatingMagnetDipole(rotor: RotatingMagnet, angle: number): PointDipole {
  const perpendicular = cross(rotor.shaftAxis, rotor.referenceDirection);
  const direction = add(
    scale(rotor.referenceDirection, Math.cos(angle)),
    scale(perpendicular, Math.sin(angle)),
  );
  return { position: rotor.position, moment: scale(direction, rotor.moment) };
}

/** Frequency (Hz) of the alternating emf: one full cycle per rotation. */
export function generatorFrequency(rotationsPerSecond: number): number {
  return Math.abs(rotationsPerSecond);
}

/**
 * Peak emf (V) of the crank generator: moment × the coil's field per ampere in the plane of
 * rotation × angular speed. The coil's field per ampere grows with its turns and area, so this
 * is the spec's turns × field × area × angular speed.
 */
export function generatorPeakEmf(
  coil: Coil,
  rotor: RotatingMagnet,
  rotationsPerSecond: number,
): number {
  const fieldPerAmp = windingField(coilWinding(coil, 1), rotor.position);
  const inPlane = sub(fieldPerAmp, scale(rotor.shaftAxis, dot(fieldPerAmp, rotor.shaftAxis)));
  return rotor.moment * length(inPlane) * 2 * Math.PI * Math.abs(rotationsPerSecond);
}
