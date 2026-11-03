import {
  add,
  dot,
  length,
  netField,
  scale,
  sub,
  traceHorizontalFieldLine,
  vec3,
  type FieldSources,
  type Vec3,
} from '@/physics';
import type { AnyModel } from '@/models/types';

// Which field lines the field-lines overlay draws: lines traced through the physics core's net
// field, across the level overlay area. Plain maths, no three.js.
//
// - Magnets and coils: lines start evenly round each north pole and run to a south pole or out
//   of the area. Lines that arrive at a south pole from elsewhere (from Earth's field, or from
//   beyond the area) are traced back from it.
// - A wire through the area: lines start at a few distances out from it and run round it until
//   they close.

/** Lines leave each pole from this many points round it. */
const SEEDS_PER_POLE = 12;
/** Lines round a wire start at these distances from it (m). */
const WIRE_RINGS = [0.012, 0.025, 0.045, 0.075, 0.11];
/** Points along a line are this far apart (m). */
const STEP = 0.0015;
const MAX_STEPS = 600;

type Region = AnyModel['overlayRegion'];

/** One field line: its points in the direction the field runs. */
export interface FieldLinePath {
  readonly points: readonly Vec3[];
}

/** A cylinder that makes a field, its two ends being its poles: a bar magnet or a coil. */
interface Body {
  readonly center: Vec3;
  /** Points from its south end to its north end. */
  readonly northward: Vec3;
  readonly radius: number;
  readonly length: number;
}

export function fieldLinePaths(sources: FieldSources, region: Region): FieldLinePath[] {
  const height = region.center.y;
  const halfDepth = region.halfDepth ?? region.halfWidth;
  const fieldAt = (point: Vec3) => netField(sources, point);
  const bodies: Body[] = [
    ...sources.magnets.map((magnet) => ({ ...magnet, northward: magnet.axis })),
    ...sources.windings
      .filter((winding) => winding.ampereTurns !== 0)
      .map((winding) => ({
        ...winding,
        northward: scale(winding.axis, Math.sign(winding.ampereTurns)),
      })),
  ];
  const poles = bodies.map((body) => ({
    north: atHeight(add(body.center, scale(body.northward, body.length / 2)), height),
    south: atHeight(add(body.center, scale(body.northward, -body.length / 2)), height),
    reach: Math.max(body.radius * 0.8, 0.004),
  }));
  const outside = (point: Vec3) =>
    Math.abs(point.x - region.center.x) > region.halfWidth ||
    Math.abs(point.z - region.center.z) > halfDepth;
  const inBody = (point: Vec3) =>
    sources.magnets.some((magnet) => inside({ ...magnet, northward: magnet.axis }, point));
  const atPole = (point: Vec3, which: 'north' | 'south') =>
    poles.some((pole) => length(sub(point, pole[which])) < pole.reach * 0.8);

  const paths: FieldLinePath[] = [];
  for (const pole of poles) {
    for (const seed of seedsAround(pole.north, pole.reach)) {
      if (inBody(seed)) continue;
      const points = traceHorizontalFieldLine(fieldAt, seed, 1, {
        step: STEP,
        maxSteps: MAX_STEPS,
        stop: (point) => outside(point) || inBody(point) || atPole(point, 'south'),
      });
      if (points.length > 2) paths.push({ points });
    }
    for (const seed of seedsAround(pole.south, pole.reach)) {
      if (inBody(seed)) continue;
      const points = traceHorizontalFieldLine(fieldAt, seed, -1, {
        step: STEP,
        maxSteps: MAX_STEPS,
        stop: (point) => outside(point) || inBody(point) || atPole(point, 'north'),
      });
      // A line traced back to a north pole was already drawn from there.
      const end = points.at(-1);
      if (points.length > 2 && end !== undefined && !atPole(end, 'north')) {
        paths.push({ points: [...points].reverse() });
      }
    }
  }

  for (const wire of sources.wires) {
    if (wire.current === 0) continue;
    // Where the wire crosses the area's level.
    const along = (height - wire.point.y) / (wire.direction.y || 1);
    const crossing = atHeight(add(wire.point, scale(wire.direction, along)), height);
    for (const ring of WIRE_RINGS) {
      const seed = vec3(crossing.x + ring, height, crossing.z);
      if (outside(seed)) continue;
      let travelled = 0;
      const points = traceHorizontalFieldLine(fieldAt, seed, 1, {
        step: STEP,
        maxSteps: MAX_STEPS * 2,
        stop: (point) => {
          travelled += STEP;
          // Closed once it comes back round to where it started.
          const home = travelled > 4 * STEP && length(sub(point, seed)) < STEP * 1.5;
          return home || outside(point) || length(sub(point, crossing)) < wire.radius;
        },
      });
      if (points.length > 2) paths.push({ points });
    }
  }
  return paths;
}

function seedsAround(pole: Vec3, radius: number): Vec3[] {
  return Array.from({ length: SEEDS_PER_POLE }, (_, index) => {
    const angle = ((index + 0.5) / SEEDS_PER_POLE) * 2 * Math.PI;
    return vec3(pole.x + radius * Math.cos(angle), pole.y, pole.z + radius * Math.sin(angle));
  });
}

function atHeight(point: Vec3, height: number): Vec3 {
  return vec3(point.x, height, point.z);
}

/** Whether a point is inside a magnet's cylinder. Lines run on through a coil's hollow middle. */
function inside(body: Body, point: Vec3): boolean {
  const offset = sub(point, body.center);
  const along = dot(offset, body.northward);
  const across = length(sub(offset, scale(body.northward, along)));
  return Math.abs(along) <= body.length / 2 && across <= body.radius;
}
