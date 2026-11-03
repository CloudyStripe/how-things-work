import { MU_0 } from './constants';
import { barMagnetField, type BarMagnet } from './magnet';
import { add, length, scale, sub, ZERO, type Vec3 } from './vector';

/**
 * One pole of a bar magnet in the pole (Gilbert) model: where it sits and its strength (A·m),
 * positive for a north pole and negative for a south pole.
 */
export interface MagnetPole {
  readonly position: Vec3;
  readonly strength: number;
}

/**
 * A bar magnet's two poles, north then south, at its ends. Pole strength is moment / length,
 * so the pair has the magnet's moment.
 */
export function barMagnetPoles(magnet: BarMagnet): readonly [MagnetPole, MagnetPole] {
  const strength = magnet.moment / magnet.length;
  const half = scale(magnet.axis, magnet.length / 2);
  return [
    { position: add(magnet.center, half), strength },
    { position: sub(magnet.center, half), strength: -strength },
  ];
}

/**
 * Force (N) that `source` exerts on `target`. Each pole of one magnet pushes or pulls each pole
 * of the other as μ0 q1 q2 / (4π r²): like poles repel, unlike poles attract. Far apart, the sum
 * becomes the force between two dipoles, falling off as 1 / distance⁴.
 */
export function barMagnetForce(source: BarMagnet, target: BarMagnet): Vec3 {
  let force = ZERO;
  for (const from of barMagnetPoles(source)) {
    for (const on of barMagnetPoles(target)) {
      const offset = sub(on.position, from.position);
      const r = length(offset);
      if (r === 0) continue;
      const size = (MU_0 * from.strength * on.strength) / (4 * Math.PI * r ** 3);
      force = add(force, scale(offset, size));
    }
  }
  return force;
}

/** Total field (T) at a point from several bar magnets. */
export function barMagnetsField(magnets: readonly BarMagnet[], point: Vec3): Vec3 {
  return magnets.reduce((field, magnet) => add(field, barMagnetField(magnet, point)), ZERO);
}
