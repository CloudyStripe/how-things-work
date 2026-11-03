/** A wind turbine's rotor: its angle (rad) and how fast it turns (rad/s). */
export interface RotorState {
  readonly angle: number;
  readonly angularSpeed: number;
}

export interface RotorParams {
  /** Blade length from the centre of the hub to the tip (m). */
  readonly radius: number;
  /**
   * Blade tip speed divided by wind speed. A three-blade turbine runs best at about 7, and its
   * control system holds it there.
   */
  readonly tipSpeedRatio: number;
  /** How quickly the heavy rotor follows a change in wind (s). */
  readonly timeConstant: number;
}

/** A large turbine's rotor: 40 m blades, tip speed seven times the wind, about 8 s to respond. */
export const LARGE_TURBINE_ROTOR: RotorParams = {
  radius: 40,
  tipSpeedRatio: 7,
  timeConstant: 8,
};

/** The speed (rad/s) the rotor settles at in a steady wind (m/s): proportional to the wind. */
export function steadyRotorSpeed(windSpeed: number, params: RotorParams): number {
  return (params.tipSpeedRatio * windSpeed) / params.radius;
}

/**
 * Advances the rotor by dt. Its speed approaches the steady speed for the wind with the rotor's
 * time constant, and its angle follows; the update is exact for any step size.
 */
export function stepRotor(
  state: RotorState,
  windSpeed: number,
  dt: number,
  params: RotorParams,
): RotorState {
  if (!(dt > 0)) return state;
  const steady = steadyRotorSpeed(windSpeed, params);
  const decay = Math.exp(-dt / params.timeConstant);
  const gap = state.angularSpeed - steady;
  return {
    angle: state.angle + steady * dt + gap * params.timeConstant * (1 - decay),
    angularSpeed: steady + gap * decay,
  };
}
