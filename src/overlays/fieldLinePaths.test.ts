import { describe, expect, it } from 'vitest';
import { EAST, NO_SOURCES, vec3, type BarMagnet, type Vec3 } from '@/physics';
import { fieldLinePaths } from './fieldLinePaths';

const MAGNET: BarMagnet = {
  center: vec3(0, 0, 0),
  axis: EAST,
  radius: 0.0075,
  length: 0.06,
  moment: 3,
};
/** Through the magnet's middle, as on the compass bench. */
const REGION = { center: vec3(0, 0, 0), halfWidth: 0.1, halfDepth: 0.07 };
/** On glass just above the magnet, as on the filings bench. */
const GLASS = { ...REGION, center: vec3(0, 0.0125, 0) };

const near = (point: Vec3 | undefined, x: number) =>
  point !== undefined && Math.hypot(point.x - x, point.z) < 0.01;

describe('fieldLinePaths', () => {
  it('draws lines out of the north pole, some round to the south pole', () => {
    const paths = fieldLinePaths({ ...NO_SOURCES, magnets: [MAGNET] }, GLASS);
    const fromNorth = paths.filter((path) => near(path.points[0], 0.03));
    expect(fromNorth.length).toBeGreaterThan(8);
    // The tight ones come round to the south pole; the wide ones leave the area.
    const roundToSouth = fromNorth.filter((path) => near(path.points.at(-1), -0.03));
    expect(roundToSouth.length).toBeGreaterThan(2);
    expect(roundToSouth.length).toBeLessThan(fromNorth.length);
  });

  it('draws no line through the magnet itself', () => {
    const paths = fieldLinePaths({ ...NO_SOURCES, magnets: [MAGNET] }, REGION);
    expect(paths.length).toBeGreaterThan(4);
    for (const path of paths) {
      for (const point of path.points.slice(1, -1)) {
        const inside = Math.abs(point.x) < 0.03 && Math.abs(point.z) < 0.0075;
        expect(inside).toBe(false);
      }
    }
  });

  it('keeps every line inside the area', () => {
    const paths = fieldLinePaths({ ...NO_SOURCES, magnets: [MAGNET], earth: true }, REGION);
    for (const path of paths) {
      // The point that crossed the edge ends the line (or, traced back, starts it).
      for (const point of path.points.slice(1, -1)) {
        expect(Math.abs(point.x)).toBeLessThanOrEqual(REGION.halfWidth);
        expect(Math.abs(point.z)).toBeLessThanOrEqual(REGION.halfDepth);
      }
    }
  });

  it('draws nothing where nothing makes a field', () => {
    expect(fieldLinePaths(NO_SOURCES, REGION)).toEqual([]);
  });
});
