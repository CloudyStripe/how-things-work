import { add, NORTH, scale, UP, type Vec3 } from './vector';

export interface EarthFieldModel {
  /** Total field strength (T). */
  readonly strength: number;
  /** Angle (rad) by which the field dips below horizontal; positive in the northern hemisphere. */
  readonly inclination: number;
}

/**
 * About 50 µT dipping 60° below horizontal, typical of mid-latitude North America. A compass
 * on a level board feels only the horizontal part: 25 µT, pointing north.
 */
export const EARTH_FIELD: EarthFieldModel = { strength: 50e-6, inclination: (60 * Math.PI) / 180 };

/** Earth's field as a vector, uniform across a lab bench: northward and dipping downward. */
export function earthField(model: EarthFieldModel = EARTH_FIELD): Vec3 {
  const horizontal = model.strength * Math.cos(model.inclination);
  const downward = model.strength * Math.sin(model.inclination);
  return add(scale(NORTH, horizontal), scale(UP, -downward));
}
