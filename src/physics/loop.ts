import { MU_0 } from './constants';
import { completeEllipticIntegrals } from './elliptic';
import { add, dot, length, scale, sub, ZERO, type Vec3 } from './vector';

/**
 * A thin circular loop of wire. Positive current circulates by the right-hand rule around
 * `axis`, so the field through the middle of the loop points along `axis`.
 */
export interface CurrentLoop {
  readonly center: Vec3;
  /** Unit vector normal to the loop. */
  readonly axis: Vec3;
  readonly radius: number;
  readonly current: number;
}

/**
 * Magnetic field (T) of a circular current loop at any point, from the exact closed form in
 * complete elliptic integrals. The field is singular on the wire itself; there this returns
 * zero.
 */
export function currentLoopField(loop: CurrentLoop, point: Vec3): Vec3 {
  const a = loop.radius;
  const offset = sub(point, loop.center);
  const z = dot(offset, loop.axis);
  const radial = sub(offset, scale(loop.axis, z));
  const rho = length(radial);

  if (rho < 1e-12 * a) {
    // On the axis: the textbook result, B = μ0 I a² / (2 (a² + z²)^(3/2)).
    const onAxis = (MU_0 * loop.current * a * a) / (2 * Math.pow(a * a + z * z, 1.5));
    return scale(loop.axis, onAxis);
  }

  const rSquared = rho * rho + z * z;
  const alphaSquared = a * a + rSquared - 2 * a * rho;
  const betaSquared = a * a + rSquared + 2 * a * rho;
  if (alphaSquared < 1e-18 * a * a) {
    return ZERO;
  }
  const beta = Math.sqrt(betaSquared);
  const { K, E } = completeEllipticIntegrals((4 * a * rho) / betaSquared);
  const c = (MU_0 * loop.current) / Math.PI;
  const radialField =
    ((c * z) / (2 * alphaSquared * beta * rho)) * ((a * a + rSquared) * E - alphaSquared * K);
  const axialField = (c / (2 * alphaSquared * beta)) * ((a * a - rSquared) * E + alphaSquared * K);
  return add(scale(radial, radialField / rho), scale(loop.axis, axialField));
}

/**
 * Mutual inductance (H) of two coaxial circular loops with radii a and b whose planes are
 * `separation` apart (Maxwell's formula). Two equal loops at zero separation are one loop,
 * which has no finite mutual inductance, and are rejected.
 */
export function coaxialLoopMutualInductance(
  radiusA: number,
  radiusB: number,
  separation: number,
): number {
  const kSquared = (4 * radiusA * radiusB) / ((radiusA + radiusB) ** 2 + separation ** 2);
  const k = Math.sqrt(kSquared);
  const prefactor = MU_0 * Math.sqrt(radiusA * radiusB);
  if (k < 0.01) {
    // Far apart the exact form cancels badly in floating point; its series is accurate here.
    return prefactor * ((Math.PI * k ** 3) / 16) * (1 + 0.75 * kSquared);
  }
  const { K, E } = completeEllipticIntegrals(kSquared);
  return prefactor * ((2 / k - k) * K - (2 / k) * E);
}
