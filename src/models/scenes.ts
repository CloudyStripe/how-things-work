import type { ComponentType } from 'react';
import { MagnetRailScene } from './magnet-rail/Scene';
import type { SceneProps } from './types';
import { WindTurbineStandinScene } from './wind-turbine-standin/Scene';

// Each model's 3D view, by model id. Imported only by the lesson viewport, which is
// lazy-loaded, so three.js stays out of the rest of the app.

type Vector3Tuple = [number, number, number];

export interface SceneView {
  readonly Scene: ComponentType<SceneProps>;
  /** The default camera: where it sits and what it looks at (metres). */
  readonly camera: { readonly position: Vector3Tuple; readonly target: Vector3Tuple };
  /** How close and far the learner may zoom (metres from the target). */
  readonly zoom: { readonly min: number; readonly max: number };
  /** How far (metres) the learner may pan the target from its default, along each axis. */
  readonly pan: number;
  /** The camera's near and far clipping distances (metres): a bench and a turbine differ. */
  readonly clip: { readonly near: number; readonly far: number };
  /** Where the main light shines from. */
  readonly light: Vector3Tuple;
}

export const scenes: Readonly<Record<string, SceneView>> = {
  'wind-turbine-standin': {
    Scene: WindTurbineStandinScene,
    camera: { position: [115, 78, 160], target: [0, 58, 0] },
    zoom: { min: 25, max: 320 },
    pan: 40,
    clip: { near: 0.5, far: 3000 },
    light: [120, 220, 160],
  },
  'magnet-rail': {
    Scene: MagnetRailScene,
    camera: { position: [0.03, 0.4, 0.8], target: [0, 0.02, 0] },
    zoom: { min: 0.12, max: 1.6 },
    pan: 0.2,
    clip: { near: 0.005, far: 10 },
    light: [0.3, 0.6, 0.4],
  },
};
