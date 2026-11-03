import { describe, expect, it } from 'vitest';
import { completeEllipticIntegrals } from './elliptic';

describe('completeEllipticIntegrals', () => {
  it('gives π/2 for both kinds at m = 0', () => {
    const { K, E } = completeEllipticIntegrals(0);
    expect(K).toBeCloseTo(Math.PI / 2, 15);
    expect(E).toBeCloseTo(Math.PI / 2, 15);
  });

  it('matches reference values', () => {
    const half = completeEllipticIntegrals(0.5);
    expect(half.K).toBeCloseTo(1.8540746773013719, 14);
    expect(half.E).toBeCloseTo(1.3506438810476755, 14);
    const steep = completeEllipticIntegrals(0.9);
    expect(steep.K).toBeCloseTo(2.5780921133481733, 14);
    expect(steep.E).toBeCloseTo(1.1047747327040733, 14);
  });

  it("satisfies Legendre's relation, E K' + E' K - K K' = π/2", () => {
    for (const m of [0.1, 0.3, 0.75]) {
      const a = completeEllipticIntegrals(m);
      const b = completeEllipticIntegrals(1 - m);
      expect(a.E * b.K + b.E * a.K - a.K * b.K).toBeCloseTo(Math.PI / 2, 13);
    }
  });

  it('rejects parameters outside 0 <= m < 1', () => {
    expect(() => completeEllipticIntegrals(1)).toThrow(RangeError);
    expect(() => completeEllipticIntegrals(-0.1)).toThrow(RangeError);
  });
});
