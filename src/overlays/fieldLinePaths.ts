import {
  add,
  dot,
  length,
  netField,
  scale,
  sub,
  traceHorizontalFieldLine,
  vec3,
  type BarMagnet,
  type FieldSources,
  type Vec3,
} from '@/physics';
import type { AnyModel } from '@/models/types';

// Which field lines the field-lines overlay draws: lines traced through the physics core's net
// field, across the level overlay area. They start evenly round each north pole and run to a
// south pole or out of the area; lines that arrive at a south pole from elsewhere (from Earth's
// field, or from beyond the area) are traced back from it. Plain maths, no three.js.

/** Lines leave each pole from this many points round it. */
const SEEDS_PER_POLE = 12;
/** Points along a line are this far apart (m). */
const STEP = 0.0015;
const MAX_STEPS = 600;

type Region = AnyModel['overlayRegion'];

/** One field line: its points in the direction the field runs. */
export interface FieldLinePath {
  readonly points: readonly Vec3[];
}

export function fieldLinePaths(sources: FieldSources, region: Region): FieldLinePath[] {
  const height = region.center.y;
  const halfDepth = region.halfDepth ?? region.halfWidth;
  const fieldAt = (point: Vec3) => netField(sources, point);
  const poles = sources.magnets.map((magnet) => ({
    magnet,
    north: atHeight(add(magnet.center, scale(magnet.axis, magnet.length / 2)), height),
    south: atHeight(add(magnet.center, scale(magnet.axis, -magnet.length / 2)), height),
    reach: seedRadius(magnet),
  }));
  const outside = (point: Vec3) =>
    Math.abs(point.x - region.center.x) > region.halfWidth ||
    Math.abs(point.z - region.center.z) > halfDepth;
  const inMagnet = (point: Vec3) => sources.magnets.some((magnet) => inside(magnet, point));
  const atPole = (point: Vec3, which: 'north' | 'south') =>
    poles.some((pole) => length(sub(point, pole[which])) < pole.reach * 0.8);

  const paths: FieldLinePath[] = [];
  for (const pole of poles) {
    for (const seed of seedsAround(pole.north, pole.reach)) {
      if (inMagnet(seed)) continue;
      const points = traceHorizontalFieldLine(fieldAt, seed, 1, {
        step: STEP,
        maxSteps: MAX_STEPS,
        stop: (point) => outside(point) || inMagnet(point) || atPole(point, 'south'),
      });
      if (points.length > 2) paths.push({ points });
    }
    for (const seed of seedsAround(pole.south, pole.reach)) {
      if (inMagnet(seed)) continue;
      const points = traceHorizontalFieldLine(fieldAt, seed, -1, {
        step: STEP,
        maxSteps: MAX_STEPS,
        stop: (point) => outside(point) || inMagnet(point) || atPole(point, 'north'),
      });
      // A line traced back to a north pole was already drawn from there.
      const end = points.at(-1);
      if (points.length > 2 && end !== undefined && !atPole(end, 'north')) {
        paths.push({ points: [...points].reverse() });
      }
    }
  }
  return paths;
}

/** How far from a pole the lines start: just clear of the magnet's end. */
function seedRadius(magnet: BarMagnet): number {
  return Math.max(magnet.radius * 0.8, 0.004);
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

/** Whether a point is inside a magnet's cylinder. */
function inside(magnet: BarMagnet, point: Vec3): boolean {
  const offset = sub(point, magnet.center);
  const along = dot(offset, magnet.axis);
  const across = length(sub(offset, scale(magnet.axis, along)));
  return Math.abs(along) <= magnet.length / 2 && across <= magnet.radius;
}
