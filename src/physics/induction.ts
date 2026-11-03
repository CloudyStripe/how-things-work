import { coilWinding, electromagnetWinding, type Coil, type IronCore } from './coil';
import { coaxialLoopMutualInductance } from './loop';
import type { PointDipole } from './magnet';
import { gaussLegendre } from './quadrature';
import { cross, dot, length, scale, sub } from './vector';
import { windingField, type Winding } from './winding';

/** Quadrature order for flux linkage, applied along both the source and the coil. */
export const FLUX_QUADRATURE_ORDER = 16;

const COAXIAL_TOLERANCE = 1e-9;

/** Step (m) for the central difference behind the flux linkage gradient. */
const GRADIENT_STEP = 1e-6;

/**
 * Flux linkage (Wb: turns × flux per turn) through a coil from a source on the same axis,
 * measured along the coil's axis. It integrates the exact loop-to-loop mutual inductance over
 * both windings, so it holds with the source outside the coil, entering it, or fully inside.
 */
export function coaxialFluxLinkage(
  source: Winding,
  coil: Coil,
  order: number = FLUX_QUADRATURE_ORDER,
): number {
  return fluxLinkageAtSeparation(source, coil, coaxialSeparation(source, coil), order);
}

/**
 * Rate of change (Wb/m) of the coaxial flux linkage as the coil moves along its axis, away
 * from the source. Multiplied by a current it gives the force between them.
 */
export function coaxialFluxLinkageGradient(
  source: Winding,
  coil: Coil,
  order: number = FLUX_QUADRATURE_ORDER,
): number {
  const separation = coaxialSeparation(source, coil);
  const ahead = fluxLinkageAtSeparation(source, coil, separation + GRADIENT_STEP, order);
  const behind = fluxLinkageAtSeparation(source, coil, separation - GRADIENT_STEP, order);
  return (ahead - behind) / (2 * GRADIENT_STEP);
}

/**
 * Flux linkage (Wb) through a coil from a point dipole anywhere. By reciprocity it equals the
 * dipole moment dotted with the coil's field per ampere at the dipole. Accurate when the
 * magnet is small compared with its distance from the coil. An iron core in the coil gathers
 * the flux as it strengthens the coil's own field: the linkage scales with the core's gain.
 */
export function dipoleFluxLinkage(
  coil: Coil,
  dipole: PointDipole,
  core: IronCore | null = null,
): number {
  const perAmpere = core === null ? coilWinding(coil, 1) : electromagnetWinding(coil, 1, core);
  return dot(dipole.moment, windingField(perAmpere, dipole.position));
}

/**
 * Faraday's law over one time step: emf = -(change in flux linkage) / dt. This is the exact
 * average emf across the step, so summing it over steps of any size gives the right total
 * charge. The minus sign is Lenz's law. No change in flux linkage gives exactly zero.
 */
export function inducedEmf(previousFluxLinkage: number, fluxLinkage: number, dt: number): number {
  if (!(dt > 0)) {
    throw new RangeError(`Time step must be positive, got ${dt}`);
  }
  const emf = -(fluxLinkage - previousFluxLinkage) / dt;
  return emf === 0 ? 0 : emf;
}

/**
 * Force (N) along the coil's axis on a coaxial source, from current in the coil:
 * F = -I × dλ/dz, with dλ/dz from coaxialFluxLinkageGradient. The coil feels the equal and
 * opposite force. When the current is induced by relative motion, this force always opposes
 * that motion: Lenz's law, felt as drag.
 */
export function axialForceOnSource(coilCurrent: number, fluxLinkageGradient: number): number {
  const force = -coilCurrent * fluxLinkageGradient;
  return force === 0 ? 0 : force;
}

/** Signed distance (m) from the source's centre to the coil's centre along the coil's axis. */
function coaxialSeparation(source: Winding, coil: Coil): number {
  if (length(cross(source.axis, coil.axis)) > COAXIAL_TOLERANCE) {
    throw new RangeError('Source and coil axes are not parallel');
  }
  const offset = sub(coil.center, source.center);
  const separation = dot(offset, coil.axis);
  if (length(sub(offset, scale(coil.axis, separation))) > COAXIAL_TOLERANCE) {
    throw new RangeError('Source is not on the coil axis');
  }
  return separation;
}

function fluxLinkageAtSeparation(
  source: Winding,
  coil: Coil,
  separation: number,
  order: number,
): number {
  const overlapping = Math.abs(separation) < (source.length + coil.length) / 2;
  if (overlapping && source.radius >= coil.radius) {
    throw new RangeError('A source that passes into a coil must be narrower than the coil');
  }

  const orientation = dot(source.axis, coil.axis) > 0 ? 1 : -1;
  const nodes = gaussLegendre(order);
  let sum = 0;
  for (const coilNode of nodes) {
    const coilZ = separation + (coil.length / 2) * coilNode.x;
    for (const sourceNode of nodes) {
      const sourceZ = (source.length / 2) * sourceNode.x;
      sum +=
        coilNode.weight *
        sourceNode.weight *
        coaxialLoopMutualInductance(coil.radius, source.radius, coilZ - sourceZ);
    }
  }
  // (N / ℓ)(NI / L) ∫∫ M dz dz', each integral mapped onto [-1, 1] (a factor of length / 2).
  return (orientation * coil.turns * source.ampereTurns * sum) / 4;
}
