import type { Vec3 } from './vector';

/** A pivoted needle: its angle (rad) and how fast it is turning (rad/s). */
export interface NeedleState {
  readonly angle: number;
  readonly angularVelocity: number;
}

/** Below this horizontal field (T) a compass has nothing to align with. */
const NO_FIELD = 1e-15;

/** Longest step (s) the needle integrator takes; longer frames are split. */
const MAX_SUBSTEP = 1e-3;

/**
 * Bearing (rad) of the horizontal part of a field, clockwise from north seen from above:
 * 0 is north, π/2 is east. A level compass needle settles here. Null when there is no
 * horizontal field.
 */
export function compassBearing(field: Vec3): number | null {
  const east = field.x;
  const north = -field.z;
  if (Math.hypot(east, north) < NO_FIELD) return null;
  return Math.atan2(east, north);
}

export interface CompassNeedleParams {
  /**
   * Needle magnetic moment divided by its moment of inertia (rad² / (s² · T)). The needle's
   * natural swing frequency is sqrt(this × horizontal field), so stronger fields swing faster.
   */
  readonly momentToInertia: number;
  /** Damping rate (1/s) from air and pivot friction. */
  readonly damping: number;
}

/** A small pocket compass: about 1.5 swings per second in Earth's 25 µT, lightly damped. */
export const COMPASS_NEEDLE: CompassNeedleParams = { momentToInertia: 3.5e6, damping: 4 };

/**
 * Advances a compass needle by dt. The field twists the needle toward its bearing with a
 * torque proportional to the horizontal field and the sine of the misalignment. The needle's
 * angle is a bearing, like compassBearing.
 */
export function stepCompassNeedle(
  state: NeedleState,
  field: Vec3,
  dt: number,
  params: CompassNeedleParams = COMPASS_NEEDLE,
): NeedleState {
  const east = field.x;
  const north = -field.z;
  const horizontal = Math.hypot(east, north);
  const fieldBearing = Math.atan2(east, north);
  const next = integrateNeedle(
    state,
    dt,
    (angle, velocity) =>
      -params.momentToInertia * horizontal * Math.sin(angle - fieldBearing) -
      params.damping * velocity,
  );
  return { angle: wrapAngle(next.angle), angularVelocity: next.angularVelocity };
}

export interface GalvanometerParams {
  /** Current (A) that deflects the needle to full scale. */
  readonly fullScaleCurrent: number;
  /** Needle angle (rad) at full scale, either side of centre zero. */
  readonly fullScaleAngle: number;
  /** Undamped natural frequency (rad/s) of the needle and its spring. */
  readonly naturalFrequency: number;
  /** 1 is critically damped; below 1 the needle overshoots a little before settling. */
  readonly dampingRatio: number;
}

/** A classroom centre-zero galvanometer: ±500 µA over ±40°, settling with a small overshoot. */
export const GALVANOMETER: GalvanometerParams = {
  fullScaleCurrent: 500e-6,
  fullScaleAngle: (40 * Math.PI) / 180,
  naturalFrequency: 2 * Math.PI * 1.5,
  dampingRatio: 0.6,
};

/** The needle hits its end stops just past full scale. */
const GALVANOMETER_STOP_RATIO = 1.1;

/**
 * Advances a galvanometer needle by dt. It settles at a deflection proportional to the
 * current, through a damped spring, and stops at its end stops when overdriven. Pass the
 * average current over the step so short pulses give the right kick.
 */
export function stepGalvanometerNeedle(
  state: NeedleState,
  current: number,
  dt: number,
  params: GalvanometerParams = GALVANOMETER,
): NeedleState {
  const target = (current / params.fullScaleCurrent) * params.fullScaleAngle;
  const omega = params.naturalFrequency;
  return integrateNeedle(
    state,
    dt,
    (angle, velocity) =>
      omega * omega * (target - angle) - 2 * params.dampingRatio * omega * velocity,
    params.fullScaleAngle * GALVANOMETER_STOP_RATIO,
  );
}

/** Semi-implicit Euler in substeps of at most MAX_SUBSTEP, with optional end stops. */
function integrateNeedle(
  state: NeedleState,
  dt: number,
  acceleration: (angle: number, velocity: number) => number,
  stop?: number,
): NeedleState {
  if (!(dt > 0)) return state;
  const steps = Math.ceil(dt / MAX_SUBSTEP);
  const h = dt / steps;
  let angle = state.angle;
  let velocity = state.angularVelocity;
  for (let step = 0; step < steps; step++) {
    velocity += acceleration(angle, velocity) * h;
    angle += velocity * h;
    if (stop !== undefined && Math.abs(angle) > stop) {
      angle = Math.sign(angle) * stop;
      velocity = 0;
    }
  }
  return { angle, angularVelocity: velocity };
}

/** Wraps an angle into (-π, π]. */
function wrapAngle(angle: number): number {
  return angle - 2 * Math.PI * Math.ceil((angle - Math.PI) / (2 * Math.PI));
}
