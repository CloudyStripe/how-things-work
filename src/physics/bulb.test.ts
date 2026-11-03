import { describe, expect, it } from 'vitest';
import { stepBulbGlow, TORCH_BULB } from './bulb';

describe('stepBulbGlow', () => {
  it('glows fully at its rated current, either way round, once warm', () => {
    expect(stepBulbGlow(0, TORCH_BULB.ratedCurrent, 1)).toBeCloseTo(1, 6);
    expect(stepBulbGlow(0, -TORCH_BULB.ratedCurrent, 1)).toBeCloseTo(1, 6);
  });

  it('glows with the heating power: half the current gives a quarter of the glow', () => {
    expect(stepBulbGlow(0, TORCH_BULB.ratedCurrent / 2, 1)).toBeCloseTo(0.25, 6);
  });

  it('lights and dims within a fraction of a second, not at once', () => {
    const warming = stepBulbGlow(0, TORCH_BULB.ratedCurrent, TORCH_BULB.warmUpTime);
    expect(warming).toBeCloseTo(1 - Math.exp(-1), 9);
    expect(stepBulbGlow(1, 0, 0.3)).toBeLessThan(0.01);
  });

  it('gives the same glow in one step or many', () => {
    let glow = 0;
    for (let i = 0; i < 10; i++) glow = stepBulbGlow(glow, 0.2, 0.01);
    expect(glow).toBeCloseTo(stepBulbGlow(0, 0.2, 0.1), 12);
  });
});
