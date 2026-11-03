import { MU_0 } from './constants';
import { currentLoopField } from './loop';
import { gaussLegendre } from './quadrature';
import { add, scale, ZERO, type Vec3 } from './vector';

/**
 * A uniform cylindrical winding: `ampereTurns` of current spread evenly along `length`.
 *
 * This one model stands in for every cylindrical magnetic source. A coil carrying current is
 * a winding of turns × current. A bar magnet is a winding too: a uniformly magnetized cylinder
 * has the same field, inside and out, as a surface current equal to its magnetization (the
 * Ampèrian model), so the field inside the magnet correctly runs from its S pole to its N pole.
 */
export interface Winding {
  readonly center: Vec3;
  /** Unit vector along the winding. Positive ampere-turns make the field inside point along it. */
  readonly axis: Vec3;
  readonly radius: number;
  readonly length: number;
  readonly ampereTurns: number;
}

/**
 * How many current loops a winding is split into (Gauss-Legendre). Accurate everywhere except
 * within a few millimetres of the winding surface itself.
 */
export const WINDING_QUADRATURE_ORDER = 24;

/** Magnetic field (T) of a winding at a point: its current loops integrated along its length. */
export function windingField(
  winding: Winding,
  point: Vec3,
  order: number = WINDING_QUADRATURE_ORDER,
): Vec3 {
  const halfLength = winding.length / 2;
  let field = ZERO;
  for (const node of gaussLegendre(order)) {
    const loopField = currentLoopField(
      {
        center: add(winding.center, scale(winding.axis, halfLength * node.x)),
        axis: winding.axis,
        radius: winding.radius,
        // (NI / L) per metre, times the node's share (L / 2) * weight of the length.
        current: (winding.ampereTurns * node.weight) / 2,
      },
      point,
    );
    field = add(field, loopField);
  }
  return field;
}

/**
 * Field (T) on the winding's own axis, `axialPosition` metres from its centre, signed along
 * the axis. Exact closed form. At the centre of a long winding it is the spec's B = μ0 n I.
 */
export function windingAxialField(winding: Winding, axialPosition: number): number {
  const turnsCurrentPerMetre = winding.ampereTurns / winding.length;
  const front = axialPosition + winding.length / 2;
  const back = axialPosition - winding.length / 2;
  return (
    ((MU_0 * turnsCurrentPerMetre) / 2) *
    (front / Math.hypot(winding.radius, front) - back / Math.hypot(winding.radius, back))
  );
}
