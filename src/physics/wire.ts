import { MU_0 } from './constants';
import { cross, dot, length, scale, sub, ZERO, type Vec3 } from './vector';

/** A long straight wire. Positive current flows along `direction`. */
export interface StraightWire {
  /** Any point on the wire's centreline. */
  readonly point: Vec3;
  /** Unit vector along the wire. */
  readonly direction: Vec3;
  /** Radius of the copper conductor (m). */
  readonly radius: number;
  readonly current: number;
}

/**
 * Field (T) of a long straight wire: B = μ0 I / (2π r), circling the wire by the right-hand
 * rule, so doubling the distance halves the field. Inside the copper the field falls linearly
 * to zero at the centre, so it never diverges.
 */
export function straightWireField(wire: StraightWire, point: Vec3): Vec3 {
  const offset = sub(point, wire.point);
  const radial = sub(offset, scale(wire.direction, dot(offset, wire.direction)));
  const r = length(radial);
  if (r === 0) return ZERO;

  const magnitude =
    r >= wire.radius
      ? (MU_0 * wire.current) / (2 * Math.PI * r)
      : (MU_0 * wire.current * r) / (2 * Math.PI * wire.radius ** 2);
  // direction × radial has length r and points around the wire.
  return scale(cross(wire.direction, radial), magnitude / r);
}
