import { describe, expect, it } from 'vitest';
import { framedCamera } from '../shared/cameraFrame';
import type { SimSnapshot, Spot } from '../types';
import { compassBenchFrame } from './camera';
import { compassBench, spotAt } from './definition';

const FOV = 30;
const ASPECT = 0.93;

/** The camera's distance with the compass at x, z (m): smaller is closer in. */
function distanceWithCompassAt(x: number, z: number): number {
  const state = compassBench.createState({ compass: spotAt(x, z) });
  const snapshot = { state } as SimSnapshot<unknown>;
  return framedCamera(compassBenchFrame(snapshot), FOV, ASPECT).distance;
}

describe("lesson 4's following camera", () => {
  it('frames the magnet and the compass where it starts', () => {
    const state = compassBench.createState({
      compass: compassBench.controls.compass.default as Spot,
    });
    const frame = compassBenchFrame({ state } as SimSnapshot<unknown>);
    const [cx, , cz] = frame.center;
    const [hx, , hz] = frame.halfSize;
    for (const x of [-0.145, -0.095, state.compass.x - 0.04, state.compass.x + 0.04]) {
      expect(Math.abs(x - cx)).toBeLessThanOrEqual(hx + 1e-9);
    }
    expect(Math.abs(state.compass.z - cz) + 0.04).toBeLessThan(hz);
  });

  it('closes in beside the magnet and widens as the compass goes far away', () => {
    const beside = distanceWithCompassAt(-0.03, 0);
    const start = distanceWithCompassAt(0.24, 0.02);
    const farthest = distanceWithCompassAt(0.26, 0.12);
    expect(beside).toBeLessThan(start * 0.6);
    expect(farthest).toBeGreaterThan(start);
  });

  it('changes smoothly as the compass moves', () => {
    let previous = distanceWithCompassAt(-0.05, 0);
    for (let x = -0.05; x <= 0.26; x += 0.005) {
      const distance = distanceWithCompassAt(x, 0);
      expect(Math.abs(distance - previous)).toBeLessThan(0.02);
      previous = distance;
    }
  });
});
