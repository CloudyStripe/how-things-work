import { add, length, scale, ZERO, type Vec3 } from './vector';

/** An object resting on a surface, or rolling or sliding along it. */
export interface SlidingBody {
  readonly position: Vec3;
  readonly velocity: Vec3;
}

export interface FrictionParams {
  readonly mass: number;
  /** Largest force (N) static friction holds back before the object starts to move. */
  readonly staticFriction: number;
  /** Friction force (N) against the motion once it moves (rolling resistance for a cart). */
  readonly kineticFriction: number;
}

/** Longest step (s) the integrator takes; longer frames are split. */
const MAX_SUBSTEP = 1e-3;

/**
 * Advances an object pushed by `force` (N) for dt. At rest, static friction holds it until the
 * force exceeds `staticFriction`. Moving, kinetic friction slows it, and it stops (never
 * reverses) when friction alone would carry it past zero speed. Pass only the force along the
 * surface; a cart on a rail gets the force projected onto the rail.
 */
export function stepSlidingBody(
  state: SlidingBody,
  force: Vec3,
  dt: number,
  params: FrictionParams,
): SlidingBody {
  if (!(dt > 0)) return state;
  const steps = Math.ceil(dt / MAX_SUBSTEP);
  const h = dt / steps;
  let position = state.position;
  let velocity = state.velocity;
  for (let step = 0; step < steps; step++) {
    if (length(velocity) === 0 && length(force) <= params.staticFriction) continue;
    const driven = add(velocity, scale(force, h / params.mass));
    const drivenSpeed = length(driven);
    const slowdown = (params.kineticFriction / params.mass) * h;
    velocity = drivenSpeed <= slowdown ? ZERO : scale(driven, 1 - slowdown / drivenSpeed);
    position = add(position, scale(velocity, h));
  }
  return { position, velocity };
}
