/** A light-emitting diode, modelled as a switch-on voltage followed by a steep, straight rise. */
export interface LedParams {
  /** Voltage (V) below which no current flows. */
  readonly forwardVoltage: number;
  /** How steeply current rises past it, as a resistance (Ω). */
  readonly resistance: number;
  /** Current (A) at full brightness. */
  readonly ratedCurrent: number;
}

/**
 * A high-brightness indicator LED: it lights from about 1.8 V, glows plainly at a milliamp and is
 * fully bright by 5 mA.
 */
export const RED_LED: LedParams = { forwardVoltage: 1.8, resistance: 25, ratedCurrent: 0.005 };

/**
 * Current (A) through two LEDs wired opposite ways across a voltage. Each conducts only one way,
 * so one lights for each direction: positive current is the LED that conducts for a positive
 * voltage. Below the forward voltage, neither does.
 */
export function ledPairCurrent(voltage: number, led: LedParams = RED_LED): number {
  const over = Math.abs(voltage) - led.forwardVoltage;
  return over > 0 ? (Math.sign(voltage) * over) / led.resistance : 0;
}

export interface InductionCircuit {
  /** Resistance of the coil's own copper (Ω). */
  readonly coilResistance: number;
  /** The meter and its series resistor (Ω). */
  readonly meterResistance: number;
  readonly led: LedParams;
}

export interface InductionCircuitState {
  /** Voltage across the coil's ends (V). */
  readonly voltage: number;
  readonly meterCurrent: number;
  /** Current through the LED pair (A), signed as in ledPairCurrent. */
  readonly ledCurrent: number;
}

/**
 * A coil's emf driving a meter and an LED pair side by side across its ends. The coil's own
 * resistance drops some of the emf; the meter always takes current, the LEDs only past their
 * forward voltage. Solved exactly: (emf - V) / coil = V / meter + LED current at V.
 */
export function solveInductionCircuit(
  emf: number,
  circuit: InductionCircuit,
): InductionCircuitState {
  const { coilResistance: coil, meterResistance: meter, led } = circuit;
  const open = (emf * meter) / (coil + meter);
  if (Math.abs(open) <= led.forwardVoltage) {
    return { voltage: open, meterCurrent: open / meter, ledCurrent: 0 };
  }
  const sign = Math.sign(emf);
  const voltage =
    (emf / coil + (sign * led.forwardVoltage) / led.resistance) /
    (1 / coil + 1 / meter + 1 / led.resistance);
  return { voltage, meterCurrent: voltage / meter, ledCurrent: ledPairCurrent(voltage, led) };
}
