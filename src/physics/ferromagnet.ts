import { MU_0 } from './constants';
import { length, scale, vec3, type Vec3 } from './vector';

/** Materials the models put near magnets. */
export type Material = 'iron' | 'steel' | 'copper' | 'wood';

/**
 * A small object that a field magnetizes: soft iron or steel takes on a moment along the field,
 * proportional to it until the material saturates.
 */
export interface MagnetizableBody {
  /** Volume of the material (m³). */
  readonly volume: number;
  /**
   * Effective susceptibility: how strongly the body magnetizes, limited by its shape (a small
   * object's own poles oppose its magnetization). Zero for a material that does not respond.
   */
  readonly susceptibility: number;
  /** Magnetization (A/m) at saturation. */
  readonly saturation: number;
}

/**
 * Effective susceptibility and saturation by material, for small compact objects. Copper and
 * wood respond about 100,000 times more weakly than steel (copper is slightly repelled), which
 * the models treat as no response.
 */
const RESPONSE: Readonly<Record<Material, { susceptibility: number; saturation: number }>> = {
  iron: { susceptibility: 30, saturation: 1.7e6 },
  steel: { susceptibility: 20, saturation: 1.6e6 },
  copper: { susceptibility: 0, saturation: 0 },
  wood: { susceptibility: 0, saturation: 0 },
};

export function magnetizableBody(material: Material, volume: number): MagnetizableBody {
  return { volume, ...RESPONSE[material] };
}

/** Size of the moment (A·m²) the body takes on in a field of the given strength (T). */
export function inducedMoment(body: MagnetizableBody, fieldStrength: number): number {
  return Math.min(
    (body.susceptibility * body.volume * fieldStrength) / MU_0,
    body.saturation * body.volume,
  );
}

/** Step (m) for the gradient's central differences. */
const GRADIENT_STEP = 1e-4;

/**
 * Force (N) on a magnetizable body at `point`: its induced moment times the gradient of the
 * field's strength, so it is pulled toward the stronger field whichever way the field points.
 * Before saturation this is (χV / 2μ0) ∇(B²); in a uniform field it is zero.
 */
export function softIronForce(
  body: MagnetizableBody,
  fieldAt: (point: Vec3) => Vec3,
  point: Vec3,
): Vec3 {
  const moment = inducedMoment(body, length(fieldAt(point)));
  if (moment === 0) return vec3(0, 0, 0);
  const strength = (dx: number, dy: number, dz: number) =>
    length(fieldAt(vec3(point.x + dx, point.y + dy, point.z + dz)));
  const h = GRADIENT_STEP;
  const gradient = vec3(
    (strength(h, 0, 0) - strength(-h, 0, 0)) / (2 * h),
    (strength(0, h, 0) - strength(0, -h, 0)) / (2 * h),
    (strength(0, 0, h) - strength(0, 0, -h)) / (2 * h),
  );
  return scale(gradient, moment);
}
