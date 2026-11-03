import { describe, expect, it } from 'vitest';
import { gaussLegendre } from './quadrature';

function integrate(order: number, f: (x: number) => number): number {
  return gaussLegendre(order).reduce((sum, node) => sum + node.weight * f(node.x), 0);
}

describe('gaussLegendre', () => {
  it('has weights summing to 2, the length of [-1, 1]', () => {
    for (const order of [1, 2, 5, 16, 24]) {
      expect(integrate(order, () => 1)).toBeCloseTo(2, 13);
    }
  });

  it('matches the known two-point rule', () => {
    const [first, second] = gaussLegendre(2);
    expect(first?.x).toBeCloseTo(1 / Math.sqrt(3), 15);
    expect(second?.x).toBeCloseTo(-1 / Math.sqrt(3), 15);
    expect(first?.weight).toBeCloseTo(1, 15);
  });

  it('integrates polynomials up to degree 2n - 1 exactly', () => {
    expect(integrate(5, (x) => x ** 8)).toBeCloseTo(2 / 9, 14);
    expect(integrate(5, (x) => x ** 9)).toBeCloseTo(0, 14);
    expect(integrate(16, (x) => x ** 30)).toBeCloseTo(2 / 31, 13);
  });

  it('integrates smooth functions accurately', () => {
    expect(integrate(16, Math.cos)).toBeCloseTo(2 * Math.sin(1), 14);
  });

  it('rejects an order below 1', () => {
    expect(() => gaussLegendre(0)).toThrow(RangeError);
  });
});
