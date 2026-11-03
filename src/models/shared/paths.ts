import { add, length, scale, sub, type Vec3 } from '@/physics';

// Wire routes, as plain points: a model's definition lays out the path its current takes, its
// scene draws a wire along the same points, and the current-flow overlay moves dots along them.

/**
 * A path through `corners`, with each inner corner rounded off by a curve of about `radius`
 * (m), so a wire bends instead of kinking. The ends stay where they are.
 */
export function roundedPath(corners: readonly Vec3[], radius: number, segments = 6): Vec3[] {
  const first = corners[0];
  if (first === undefined) return [];
  const points: Vec3[] = [first];
  for (let i = 1; i < corners.length - 1; i++) {
    const previous = corners[i - 1];
    const corner = corners[i];
    const next = corners[i + 1];
    if (previous === undefined || corner === undefined || next === undefined) continue;
    const inLength = length(sub(corner, previous));
    const outLength = length(sub(next, corner));
    const cut = Math.min(radius, inLength / 2, outLength / 2);
    const enter = add(corner, scale(sub(previous, corner), cut / inLength));
    const leave = add(corner, scale(sub(next, corner), cut / outLength));
    // A quadratic curve from where the wire leaves the straight to where it rejoins it.
    for (let step = 0; step <= segments; step++) {
      const t = step / segments;
      points.push(
        add(add(scale(enter, (1 - t) ** 2), scale(corner, 2 * (1 - t) * t)), scale(leave, t ** 2)),
      );
    }
  }
  const last = corners.at(-1);
  if (last !== undefined && corners.length > 1) points.push(last);
  return points;
}

/** Joins paths end to start into one, dropping a point repeated at a join. */
export function joinPaths(...paths: readonly (readonly Vec3[])[]): Vec3[] {
  const joined: Vec3[] = [];
  for (const path of paths) {
    for (const point of path) {
      const last = joined.at(-1);
      if (last === undefined || length(sub(point, last)) > 1e-9) joined.push(point);
    }
  }
  return joined;
}

/**
 * A coil's winding as drawn, along x: `turns` turns of radius `radius` (m) from its right end to
 * its left, starting at the back (-z). Each turn goes round from +y toward +z, so by the
 * right-hand rule a current running this way makes the field inside point along +x.
 */
export function windingPath(center: Vec3, radius: number, length: number, turns: number): Vec3[] {
  const points: Vec3[] = [];
  const perTurn = 24;
  const total = turns * perTurn;
  for (let index = 0; index <= total; index++) {
    const angle = -Math.PI / 2 + (index / perTurn) * 2 * Math.PI;
    points.push({
      x: center.x + length / 2 - (index / total) * length,
      y: center.y + radius * Math.cos(angle),
      z: center.z + radius * Math.sin(angle),
    });
  }
  return points;
}
