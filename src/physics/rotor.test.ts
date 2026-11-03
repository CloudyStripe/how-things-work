import { describe, expect, it } from 'vitest';
import { LARGE_TURBINE_ROTOR, steadyRotorSpeed, stepRotor, type RotorState } from './rotor';
import { relativeError } from './test-fixtures';

const STILL: RotorState = { angle: 0, angularSpeed: 0 };

describe('turbine rotor', () => {
  it('settles at a speed proportional to the wind', () => {
    const at5 = steadyRotorSpeed(5, LARGE_TURBINE_ROTOR);
    const at10 = steadyRotorSpeed(10, LARGE_TURBINE_ROTOR);
    expect(relativeError(at10, 2 * at5)).toBeLessThan(1e-12);
    // 10 m/s wind: tips at 70 m/s on 40 m blades, about 17 turns a minute.
    expect((at10 * 60) / (2 * Math.PI)).toBeCloseTo(16.7, 1);
  });

  it('spins up from rest with its time constant', () => {
    const { timeConstant } = LARGE_TURBINE_ROTOR;
    const after = stepRotor(STILL, 10, timeConstant, LARGE_TURBINE_ROTOR);
    const steady = steadyRotorSpeed(10, LARGE_TURBINE_ROTOR);
    expect(after.angularSpeed / steady).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(after.angle).toBeGreaterThan(0);
  });

  it('gives the same result in one step or many', () => {
    const once = stepRotor(STILL, 10, 3, LARGE_TURBINE_ROTOR);
    let many = STILL;
    for (let i = 0; i < 180; i++) many = stepRotor(many, 10, 3 / 180, LARGE_TURBINE_ROTOR);
    expect(relativeError(many.angle, once.angle)).toBeLessThan(1e-9);
    expect(relativeError(many.angularSpeed, once.angularSpeed)).toBeLessThan(1e-9);
  });

  it('slows to a stop when the wind drops', () => {
    const turning: RotorState = { angle: 0, angularSpeed: 1.75 };
    const after = stepRotor(turning, 0, 60, LARGE_TURBINE_ROTOR);
    expect(after.angularSpeed).toBeLessThan(1e-3);
  });
});
