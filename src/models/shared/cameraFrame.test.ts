import { describe, expect, it } from 'vitest';
import { framedCamera, type CameraFrame, type Vector3Tuple } from './cameraFrame';

const BENCH: CameraFrame = {
  center: [0, 0.03, 0],
  halfSize: [0.28, 0.03, 0.04],
  azimuth: 20,
  elevation: 30,
  margin: 0.05,
};
const FOV = 40;

/** Where each corner of the frame lands on screen, from -1 to 1 across and up. */
function projectedCorners(frame: CameraFrame, aspect: number): [number, number][] {
  const camera = framedCamera(frame, FOV, aspect);
  const forward = normalize(sub(camera.target, camera.position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const tanUp = Math.tan((FOV * Math.PI) / 360);
  const [hx, hy, hz] = frame.halfSize;
  const points: [number, number][] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const corner: Vector3Tuple = [
          frame.center[0] + sx * hx,
          frame.center[1] + sy * hy,
          frame.center[2] + sz * hz,
        ];
        const relative = sub(corner, camera.position);
        const depth = dot(relative, forward);
        points.push([
          dot(relative, right) / (depth * tanUp * aspect),
          dot(relative, up) / (depth * tanUp),
        ]);
      }
    }
  }
  return points;
}

describe('framedCamera', () => {
  it.each([0.75, 1, 1.6])('fills a view of aspect %f with the whole box', (aspect) => {
    const points = projectedCorners(BENCH, aspect);
    const reach = Math.max(...points.flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]));
    // Inside the margin, and touching it on the tightest side.
    expect(reach).toBeCloseTo(1 - BENCH.margin, 6);
  });

  it('centres the box on screen', () => {
    const points = projectedCorners(BENCH, 1);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(0, 4);
    expect(Math.min(...ys) + Math.max(...ys)).toBeCloseTo(0, 4);
  });

  it('comes closer to a wide bench in a wider view', () => {
    expect(framedCamera(BENCH, FOV, 1.6).distance).toBeLessThan(
      framedCamera(BENCH, FOV, 1).distance,
    );
  });

  it('looks from the frame angle: straight in front and level at zero degrees', () => {
    const level = framedCamera({ ...BENCH, azimuth: 0, elevation: 0 }, FOV, 1);
    expect(level.position[0]).toBeCloseTo(level.target[0], 9);
    expect(level.position[1]).toBeCloseTo(level.target[1], 9);
    expect(level.position[2]).toBeGreaterThan(level.target[2]);
  });
});

function sub(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vector3Tuple, b: Vector3Tuple): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(a: Vector3Tuple): Vector3Tuple {
  const size = Math.hypot(...a);
  return [a[0] / size, a[1] / size, a[2] / size];
}
