import { earthField } from './earth';
import { barMagnetField, type BarMagnet } from './magnet';
import { add, ZERO, type Vec3 } from './vector';
import { windingField, type Winding } from './winding';
import { straightWireField, type StraightWire } from './wire';

/** Everything in a model that makes a magnetic field, as overlays and instruments read it. */
export interface FieldSources {
  readonly wires: readonly StraightWire[];
  readonly magnets: readonly BarMagnet[];
  /** Coils carrying current, with any iron core folded in (`electromagnetWinding`). */
  readonly windings: readonly Winding[];
  /** Whether Earth's field counts too. */
  readonly earth: boolean;
}

export const NO_SOURCES: FieldSources = { wires: [], magnets: [], windings: [], earth: false };

/** The total field (T) at a point: every wire, magnet and coil, and Earth's field if it counts. */
export function netField(sources: FieldSources, point: Vec3): Vec3 {
  let field = sources.earth ? earthField() : ZERO;
  for (const wire of sources.wires) field = add(field, straightWireField(wire, point));
  for (const magnet of sources.magnets) field = add(field, barMagnetField(magnet, point));
  for (const winding of sources.windings) field = add(field, windingField(winding, point));
  return field;
}
