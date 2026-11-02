export interface QuadratureNode {
  readonly x: number;
  readonly weight: number;
}

const cache = new Map<number, readonly QuadratureNode[]>();

/**
 * Gauss-Legendre nodes and weights on [-1, 1]. An n-point rule integrates polynomials up to
 * degree 2n - 1 exactly. Nodes are found by Newton iteration on the Legendre polynomial P_n.
 */
export function gaussLegendre(order: number): readonly QuadratureNode[] {
  if (!Number.isInteger(order) || order < 1) {
    throw new RangeError(`Quadrature order must be a positive integer, got ${order}`);
  }
  const cached = cache.get(order);
  if (cached) return cached;

  const nodes: QuadratureNode[] = [];
  for (let i = 1; i <= order; i++) {
    // Standard starting guess for the i-th root, then Newton steps.
    let x = Math.cos((Math.PI * (i - 0.25)) / (order + 0.5));
    let derivative = 0;
    for (let iteration = 0; iteration < 100; iteration++) {
      // Recurrence up to P_n (current) and P_(n-1) (previous).
      let previous = 1;
      let current = x;
      for (let degree = 2; degree <= order; degree++) {
        const next = ((2 * degree - 1) * x * current - (degree - 1) * previous) / degree;
        previous = current;
        current = next;
      }
      derivative = (order * (x * current - previous)) / (x * x - 1);
      const step = current / derivative;
      x -= step;
      if (Math.abs(step) < 1e-15) break;
    }
    nodes.push({ x, weight: 2 / ((1 - x * x) * derivative * derivative) });
  }

  cache.set(order, nodes);
  return nodes;
}
