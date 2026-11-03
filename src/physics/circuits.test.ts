import { describe, expect, it } from 'vitest';
import {
  circuitCurrent,
  stepSwitchedCoil,
  timeConstant,
  type SwitchedCoilCircuit,
} from './circuits';
import { relativeError } from './test-fixtures';

describe('circuitCurrent', () => {
  it("follows Ohm's law", () => {
    expect(circuitCurrent(1.5, 3)).toBe(0.5);
  });

  it('is exactly +0 with no emf', () => {
    expect(Object.is(circuitCurrent(0, 3), 0)).toBe(true);
  });

  it('rejects a resistance that is not positive', () => {
    expect(() => circuitCurrent(1, 0)).toThrow(RangeError);
  });
});

describe('stepSwitchedCoil', () => {
  const circuit: SwitchedCoilCircuit = {
    batteryVoltage: 1.5,
    closedResistance: 3,
    openResistance: 300,
    inductance: 3e-3,
  };
  const riseTime = timeConstant(circuit.inductance, circuit.closedResistance);

  it('rises 63% of the way to V / R in one time constant after closing', () => {
    const current = stepSwitchedCoil(0, circuit, true, riseTime);
    expect(relativeError(current, 0.5 * (1 - Math.exp(-1)))).toBeLessThan(1e-14);
  });

  it('settles at V / R', () => {
    let current = 0;
    for (let step = 0; step < 100; step++)
      current = stepSwitchedCoil(current, circuit, true, riseTime);
    expect(current).toBeCloseTo(0.5, 14);
  });

  it('gives the same result for one long step as for many short ones', () => {
    let fine = 0;
    for (let step = 0; step < 1000; step++) {
      fine = stepSwitchedCoil(fine, circuit, true, riseTime / 1000);
    }
    expect(relativeError(fine, stepSwitchedCoil(0, circuit, true, riseTime))).toBeLessThan(1e-12);
  });

  it('collapses far faster once the switch opens', () => {
    const fallTime = timeConstant(circuit.inductance, circuit.openResistance);
    expect(fallTime).toBeLessThan(riseTime / 50);
    const current = stepSwitchedCoil(0.5, circuit, false, fallTime);
    expect(relativeError(current, 0.5 * Math.exp(-1))).toBeLessThan(1e-14);
  });
});
