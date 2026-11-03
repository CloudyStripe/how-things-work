import { describe, expect, it } from 'vitest';
import { inducedMoment, magnetizableBody, softIronForce } from './ferromagnet';
import { barMagnetField, type BarMagnet } from './magnet';
import { magnetAt, relativeError } from './test-fixtures';
import { EAST, length, scale, vec3 } from './vector';

/** A steel paper clip: about 0.4 g of steel. */
const CLIP = magnetizableBody('steel', 5e-8);

function fieldOf(magnet: BarMagnet) {
  return (point: ReturnType<typeof vec3>) => barMagnetField(magnet, point);
}

describe('softIronForce', () => {
  it('pulls steel toward the magnet, beside either pole', () => {
    const magnet = magnetAt(0);
    const beyondNorth = softIronForce(CLIP, fieldOf(magnet), vec3(0.05, 0, 0));
    const beyondSouth = softIronForce(CLIP, fieldOf(magnet), vec3(-0.05, 0, 0));
    expect(beyondNorth.x).toBeLessThan(0);
    expect(beyondSouth.x).toBeGreaterThan(0);
  });

  it('pulls toward the stronger field whichever way the field points', () => {
    const turned = magnetAt(0, true);
    expect(softIronForce(CLIP, fieldOf(turned), vec3(0.05, 0, 0)).x).toBeLessThan(0);
  });

  it('is zero in a uniform field, however strong', () => {
    const uniform = () => scale(EAST, 0.05);
    expect(length(softIronForce(CLIP, uniform, vec3(0.01, 0.02, 0.03)))).toBeLessThan(1e-9);
  });

  it('quadruples when the field doubles, before the steel saturates', () => {
    const point = vec3(0.12, 0, 0);
    const weak = softIronForce(CLIP, fieldOf(magnetAt(0)), point).x;
    const strong = softIronForce(CLIP, fieldOf({ ...magnetAt(0), moment: 6 }), point).x;
    expect(relativeError(strong / weak, 4)).toBeLessThan(1e-3);
  });

  it('only doubles when the field doubles once the steel is saturated', () => {
    // Very close to a strong magnet the clip is saturated: its moment no longer grows.
    const point = vec3(0.032, 0, 0);
    const magnet: BarMagnet = { ...magnetAt(0), moment: 30 };
    const once = softIronForce(CLIP, fieldOf(magnet), point).x;
    const twice = softIronForce(CLIP, fieldOf({ ...magnet, moment: 60 }), point).x;
    expect(relativeError(twice / once, 2)).toBeLessThan(1e-3);
  });

  it('jumps a paper clip from a centimetre or two, but not from across the bench', () => {
    // Static friction holds a 0.4 g clip on wood with about 2 mN.
    const holdingFriction = 0.002;
    const magnet = magnetAt(0);
    const pull = (gap: number) =>
      Math.abs(softIronForce(CLIP, fieldOf(magnet), vec3(0.03 + gap, 0, 0)).x);
    expect(pull(0.01)).toBeGreaterThan(holdingFriction);
    expect(pull(0.1)).toBeLessThan(holdingFriction);
  });

  it('gives exactly no force on copper or wood', () => {
    const magnet = magnetAt(0);
    for (const material of ['copper', 'wood'] as const) {
      const body = magnetizableBody(material, 5e-8);
      expect(length(softIronForce(body, fieldOf(magnet), vec3(0.04, 0, 0)))).toBe(0);
    }
  });
});

describe('inducedMoment', () => {
  it('grows with the field and stops at saturation', () => {
    expect(inducedMoment(CLIP, 0.002)).toBeCloseTo(2 * inducedMoment(CLIP, 0.001), 12);
    expect(inducedMoment(CLIP, 10)).toBeCloseTo(1.6e6 * 5e-8, 12);
  });
});
