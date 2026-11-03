import { MU_0 } from './constants';
import { add, dot, length, scale, sub, ZERO, type Vec3 } from './vector';
import { windingField, type Winding } from './winding';

/** A cylindrical bar magnet, uniformly magnetized along its length. */
export interface BarMagnet {
  readonly center: Vec3;
  /** Unit vector from the south pole to the north pole. Flipping the magnet negates it. */
  readonly axis: Vec3;
  readonly radius: number;
  readonly length: number;
  /** Magnetic dipole moment (A·m²): magnetization × volume. */
  readonly moment: number;
}

/**
 * The magnet as an equivalent winding (Ampèrian surface current). Its ampere-turns are
 * magnetization × length, which is moment / (π r²).
 */
export function barMagnetWinding(magnet: BarMagnet): Winding {
  return {
    center: magnet.center,
    axis: magnet.axis,
    radius: magnet.radius,
    length: magnet.length,
    ampereTurns: magnet.moment / (Math.PI * magnet.radius ** 2),
  };
}

/**
 * Field (T) of a bar magnet, inside and out. Far away it becomes a dipole field, falling off
 * as 1 / distance³.
 */
export function barMagnetField(magnet: BarMagnet, point: Vec3): Vec3 {
  return windingField(barMagnetWinding(magnet), point);
}

/** A magnet small compared with its distance from whatever it acts on. */
export interface PointDipole {
  readonly position: Vec3;
  /** Moment vector (A·m²), pointing from S to N. */
  readonly moment: Vec3;
}

/** Field (T) of a point dipole: μ0 / (4π) × (3 (m · r̂) r̂ - m) / r³. */
export function pointDipoleField(dipole: PointDipole, point: Vec3): Vec3 {
  const offset = sub(point, dipole.position);
  const r = length(offset);
  if (r === 0) return ZERO;
  const direction = scale(offset, 1 / r);
  const along = scale(direction, 3 * dot(dipole.moment, direction));
  return scale(add(along, scale(dipole.moment, -1)), MU_0 / (4 * Math.PI * r ** 3));
}
