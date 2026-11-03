export interface CompleteEllipticIntegrals {
  /** First kind, K(m). */
  readonly K: number;
  /** Second kind, E(m). */
  readonly E: number;
}

/**
 * Complete elliptic integrals of the first and second kind for parameter m = k², computed
 * with the arithmetic-geometric mean. Valid for 0 <= m < 1 (K diverges at m = 1).
 */
export function completeEllipticIntegrals(m: number): CompleteEllipticIntegrals {
  if (!(m >= 0 && m < 1)) {
    throw new RangeError(`Elliptic parameter must satisfy 0 <= m < 1, got ${m}`);
  }

  let a = 1;
  let b = Math.sqrt(1 - m);
  // E = K * (1 - sum of 2^(n-1) c_n^2), with c_0 = k.
  let power = 0.5;
  let sum = power * m;
  for (let iteration = 0; iteration < 50; iteration++) {
    const c = (a - b) / 2;
    const nextA = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = nextA;
    power *= 2;
    sum += power * c * c;
    if (Math.abs(c) < 1e-16 * a) break;
  }

  const K = Math.PI / (2 * a);
  return { K, E: K * (1 - sum) };
}
