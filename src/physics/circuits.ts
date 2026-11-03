/** Current (A) an emf drives around a circuit of the given total resistance (Ohm's law). */
export function circuitCurrent(emf: number, totalResistance: number): number {
  if (!(totalResistance > 0)) {
    throw new RangeError(`Resistance must be positive, got ${totalResistance}`);
  }
  const current = emf / totalResistance;
  return current === 0 ? 0 : current;
}

/** A coil wired to a battery through a switch, as coil A in the capstone. */
export interface SwitchedCoilCircuit {
  readonly batteryVoltage: number;
  /** Coil plus battery internal resistance (Ω), with the switch closed. */
  readonly closedResistance: number;
  /**
   * Resistance (Ω) of the path the coil's current takes once the switch opens: the spark
   * across the contacts. Large, so the current collapses quickly but not instantly.
   */
  readonly openResistance: number;
  readonly inductance: number;
}

/** Time constant (s) of a coil and resistance: how long the current takes to make 63% of a change. */
export function timeConstant(inductance: number, resistance: number): number {
  return inductance / resistance;
}

/**
 * Advances the coil's current by dt. An inductor resists change, so the current approaches
 * its target exponentially instead of jumping: with the switch closed it rises toward V / R;
 * once the switch opens it collapses to zero through the open-switch resistance. The update
 * is exact for any step size.
 */
export function stepSwitchedCoil(
  current: number,
  circuit: SwitchedCoilCircuit,
  switchClosed: boolean,
  dt: number,
): number {
  const resistance = switchClosed ? circuit.closedResistance : circuit.openResistance;
  const target = switchClosed ? circuit.batteryVoltage / resistance : 0;
  const decay = Math.exp(-dt / timeConstant(circuit.inductance, resistance));
  return target + (current - target) * decay;
}
