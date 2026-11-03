import { magnetizableBody, type MagnetizableBody } from './ferromagnet';
import type { FrictionParams } from './motion';
import { compassBearing } from './needles';
import type { Vec3 } from './vector';

// Iron filings on a sheet of glass over a magnet. Each filing is a tiny piece of iron: the field
// magnetizes it along its length, so it turns to lie along the field where it rests (it has no
// north end of its own, so either way round will do), and it is pulled toward the stronger field.
// Friction on the glass holds it where the field is weak.

export interface FilingParams {
  readonly body: MagnetizableBody;
  /** Friction on the glass, while the glass is tapped to help the filings settle. */
  readonly friction: FrictionParams;
  /** Weakest horizontal field (T) that turns a filing against friction. */
  readonly alignField: number;
  /** How quickly a filing turns into line (s): it settles within a few of these. */
  readonly turnTime: number;
}

/**
 * A coarse filing about 4 mm long and 0.45 mm across: 0.64 mm³ of iron, 5 mg. Filings lie tangled
 * with their neighbours, so friction holds one about ten times harder than it would hold a lone
 * filing on glass. With that, only the filings within a centimetre or so of a pole slide to it, as
 * in a real demonstration, and a field under about 0.8 mT (some 30 times Earth's) leaves a filing
 * lying as it fell.
 */
export const IRON_FILING: FilingParams = {
  body: magnetizableBody('iron', 6.4e-10),
  friction: { mass: 5e-6, staticFriction: 3e-4, kineticFriction: 2.1e-4 },
  alignField: 8e-4,
  turnTime: 0.08,
};

/**
 * The bearing (rad) a filing lines up with: along the horizontal part of the field, the same
 * line a compass would show. Null where the field is too weak to turn it against friction.
 */
export function filingAxis(field: Vec3, params: FilingParams = IRON_FILING): number | null {
  if (Math.hypot(field.x, field.z) < params.alignField) return null;
  return compassBearing(field);
}

/**
 * Turns a filing (its bearing, rad) toward `axis` over dt, whichever way round is nearer. It is
 * overdamped: it swings into line without overshooting. Where there is no axis it stays put.
 */
export function turnFiling(
  angle: number,
  axis: number | null,
  dt: number,
  params: FilingParams = IRON_FILING,
): number {
  if (axis === null || !(dt > 0)) return angle;
  const offset = wrapHalfTurn(angle - axis);
  return axis + offset * Math.exp(-dt / params.turnTime);
}

/** Wraps an angle into [-π/2, π/2): a filing's two ends are alike, so half a turn is no turn. */
function wrapHalfTurn(angle: number): number {
  return angle - Math.PI * Math.round(angle / Math.PI);
}
