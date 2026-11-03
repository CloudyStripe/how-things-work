import type { ComponentType } from 'react';
import { PlaceholderWireCompassScene } from './placeholder-wire-compass/Scene';
import type { SceneProps } from './types';

// Each model's 3D view, by model id. Imported only by the experiment viewport, which is
// lazy-loaded, so three.js stays out of the rest of the app.

type Vector3Tuple = [number, number, number];

export interface SceneView {
  readonly Scene: ComponentType<SceneProps>;
  /** The default camera: where it sits and what it looks at (metres). */
  readonly camera: { readonly position: Vector3Tuple; readonly target: Vector3Tuple };
  /** How close and far the learner may zoom (metres from the target). */
  readonly zoom: { readonly min: number; readonly max: number };
}

export const scenes: Readonly<Record<string, SceneView>> = {
  'placeholder-wire-compass': {
    Scene: PlaceholderWireCompassScene,
    camera: { position: [0.055, 0.07, 0.085], target: [0, 0, -0.01] },
    zoom: { min: 0.04, max: 0.35 },
  },
};
