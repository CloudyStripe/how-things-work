import { describe, expect, it } from 'vitest';
import { ledPairCurrent, RED_LED, solveInductionCircuit } from './led';

const CIRCUIT = { coilResistance: 240, meterResistance: 4000, led: RED_LED };

describe('ledPairCurrent', () => {
  it('passes nothing below the forward voltage, either way', () => {
    expect(ledPairCurrent(1.7)).toBe(0);
    expect(ledPairCurrent(-1.7)).toBe(0);
  });

  it('lights one LED for each direction', () => {
    expect(ledPairCurrent(2.3)).toBeCloseTo(0.5 / RED_LED.resistance, 12);
    expect(ledPairCurrent(-2.3)).toBeCloseTo(-0.5 / RED_LED.resistance, 12);
  });
});

describe('solveInductionCircuit', () => {
  it('gives no current at all for no emf: a still magnet lights nothing', () => {
    expect(solveInductionCircuit(0, CIRCUIT)).toEqual({
      voltage: 0,
      meterCurrent: 0,
      ledCurrent: 0,
    });
  });

  it('drives only the meter while the emf is small', () => {
    const small = solveInductionCircuit(1, CIRCUIT);
    expect(small.ledCurrent).toBe(0);
    expect(small.meterCurrent).toBeCloseTo(1 / (240 + 4000), 12);
  });

  it('balances currents once the LEDs conduct: what leaves the coil goes through one branch or the other', () => {
    const big = solveInductionCircuit(4, CIRCUIT);
    expect(big.ledCurrent).toBeGreaterThan(0);
    const fromCoil = (4 - big.voltage) / CIRCUIT.coilResistance;
    expect(fromCoil).toBeCloseTo(big.meterCurrent + big.ledCurrent, 12);
  });

  it('reverses every current when the emf reverses', () => {
    const forward = solveInductionCircuit(4, CIRCUIT);
    const back = solveInductionCircuit(-4, CIRCUIT);
    expect(back.meterCurrent).toBeCloseTo(-forward.meterCurrent, 12);
    expect(back.ledCurrent).toBeCloseTo(-forward.ledCurrent, 12);
  });
});
