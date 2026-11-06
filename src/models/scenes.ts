import type { ComponentType } from 'react';
import { CircuitBoardScene } from './circuit-board/Scene';
import { CoilMagnetScene } from './coil-magnet/Scene';
import { CoilTrayScene } from './coil-tray/Scene';
import { compassBenchFrame } from './compass-bench/camera';
import { CompassBenchScene } from './compass-bench/Scene';
import { CrankGeneratorScene } from './crank-generator/Scene';
import { FilingsBenchScene } from './filings-bench/Scene';
import { MagnetRailScene } from './magnet-rail/Scene';
import type { CameraFrame, Vector3Tuple } from './shared/cameraFrame';
import type { SceneProps, SimSnapshot } from './types';
import { EXPLODE } from './wind-turbine/definition';
import { WindTurbineScene } from './wind-turbine/Scene';
import { WireBoardScene } from './wire-board/Scene';

// Each model's 3D view, by model id. Imported only by the lesson viewport, which is
// lazy-loaded, so three.js stays out of the rest of the app.

export interface SceneView {
  readonly Scene: ComponentType<SceneProps>;
  /**
   * What the default camera frames and from which angle. The viewport fits the camera to the
   * view's size, so the frame fills the model view on any window.
   */
  readonly frame: CameraFrame;
  /**
   * A camera that follows the model: the frame to fit now, from the model's state. The camera
   * eases toward it every frame until the learner turns, pans or zooms the view, and again after
   * Reset view. The fixed frame then only sets how far the learner may zoom and pan.
   */
  readonly follow?: (snapshot: SimSnapshot<unknown>) => CameraFrame;
  /** How close and far the learner may zoom, as multiples of the framed distance. */
  readonly zoom: { readonly min: number; readonly max: number };
  /** How far (metres) the learner may pan the target from its default, along each axis. */
  readonly pan: number;
  /** The camera's near and far clipping distances (metres): a bench and a turbine differ. */
  readonly clip: { readonly near: number; readonly far: number };
  /** Where the main light shines from. */
  readonly light: Vector3Tuple;
  /**
   * In an explorer: what the camera flies to when a part is picked, removed or put back, with the
   * part in place. It moves out with the part (explode) as the exploded view opens.
   */
  readonly partFrames?: Readonly<Record<string, CameraFrame>>;
  /** In an explorer: how far (m) and which way each part moves at the fully exploded view. */
  readonly explode?: Readonly<Record<string, readonly [number, number, number]>>;
  /** What the camera flies to when an overlay turns on, where it reads best. */
  readonly overlayFrames?: Readonly<Record<string, CameraFrame>>;
  /** How low the learner may turn the view (radians from straight down), if lower than usual. */
  readonly maxPolar?: number;
  /** The lowest the camera may go (m), where a scene has ground it must not sink through. */
  readonly cameraFloor?: number;
}

export const scenes: Readonly<Record<string, SceneView>> = {
  'wind-turbine': {
    Scene: WindTurbineScene,
    // The tower and the rotor, with room for the parts to pull out, looking up from low down, so
    // the turbine stands against the sky and the land recedes behind it.
    frame: {
      center: [0, 58, 4],
      halfSize: [40, 58, 14],
      azimuth: 36,
      elevation: -6,
      margin: 0.06,
    },
    maxPolar: 1.7,
    cameraFloor: 2,
    // Close enough to look into the nacelle.
    zoom: { min: 0.02, max: 1.6 },
    pan: 40,
    clip: { near: 0.5, far: 3000 },
    light: [120, 220, 160],
    partFrames: {
      blades: {
        center: [0, 80, 2.6],
        halfSize: [40, 40, 2],
        azimuth: 20,
        elevation: 10,
        margin: 0.05,
      },
      hub: { center: [0, 80, 3], halfSize: [3, 3, 2.5], azimuth: 35, elevation: 14, margin: 0.08 },
      nacelleCover: {
        center: [0, 81, -3.9],
        halfSize: [2.4, 2.6, 6],
        azimuth: 55,
        elevation: 22,
        margin: 0.06,
      },
      mainShaft: {
        center: [0, 80, -0.7],
        halfSize: [1.8, 1.8, 2.8],
        azimuth: 55,
        elevation: 22,
        margin: 0.08,
      },
      gearbox: {
        center: [0, 80, -4.1],
        halfSize: [2, 1.8, 2],
        azimuth: 55,
        elevation: 22,
        margin: 0.08,
      },
      generator: {
        center: [0, 80.5, -7.4],
        halfSize: [1.5, 1.5, 1.6],
        azimuth: 55,
        elevation: 22,
        margin: 0.08,
      },
      tower: { center: [0, 40, 0], halfSize: [4, 41, 4], azimuth: 36, elevation: 10, margin: 0.05 },
    },
    explode: EXPLODE,
    overlayFrames: {
      // From in front, along the shaft, where the magnets and coils lie side by side; far enough
      // out to stand clear of the spinner.
      generator: {
        center: [0, 80.5, -7.4],
        halfSize: [4, 4, 0.5],
        azimuth: 6,
        elevation: 10,
        margin: 0.04,
      },
    },
  },
  'magnet-rail': {
    Scene: MagnetRailScene,
    // The rail from end stop to end stop, up to the labels over the magnets.
    frame: {
      center: [0, 0.03, 0],
      halfSize: [0.28, 0.03, 0.02],
      azimuth: 34,
      elevation: 26,
      margin: 0.04,
    },
    zoom: { min: 0.2, max: 2.2 },
    pan: 0.2,
    clip: { near: 0.005, far: 10 },
    light: [0.3, 0.6, 0.4],
  },
  'filings-bench': {
    Scene: FilingsBenchScene,
    // The magnet's path with the three objects in front, and the glass behind.
    frame: {
      center: [0, 0.02, -0.035],
      halfSize: [0.25, 0.02, 0.135],
      azimuth: 30,
      elevation: 34,
      margin: 0.04,
    },
    zoom: { min: 0.2, max: 2.2 },
    pan: 0.2,
    clip: { near: 0.005, far: 10 },
    light: [0.3, 0.6, 0.4],
  },
  'compass-bench': {
    Scene: CompassBenchScene,
    // Everywhere the compass can go, the magnet and the north arrow: the widest view, which sets
    // the zoom limits. The camera itself follows the compass, close in beside the magnet and
    // wider as the compass goes far away.
    frame: {
      center: [0.03, 0.015, -0.015],
      halfSize: [0.28, 0.015, 0.165],
      azimuth: 24,
      elevation: 40,
      margin: 0.03,
    },
    follow: compassBenchFrame,
    zoom: { min: 0.2, max: 2.2 },
    pan: 0.25,
    clip: { near: 0.005, far: 10 },
    light: [0.3, 0.6, 0.4],
  },
  'circuit-board': {
    Scene: CircuitBoardScene,
    // The board and everything on it, up to the top of the bulb.
    frame: {
      center: [0, 0.03, 0],
      halfSize: [0.18, 0.03, 0.11],
      azimuth: 26,
      elevation: 38,
      margin: 0.04,
    },
    zoom: { min: 0.2, max: 2.2 },
    pan: 0.2,
    clip: { near: 0.005, far: 10 },
    light: [0.3, 0.6, 0.4],
  },
  'wire-board': {
    Scene: WireBoardScene,
    // The board and its compasses, and the wire's foot; the wire runs on up out of view.
    frame: {
      center: [0, 0.085, 0],
      halfSize: [0.17, 0.035, 0.15],
      azimuth: 28,
      elevation: 38,
      margin: 0.04,
    },
    zoom: { min: 0.2, max: 2.2 },
    pan: 0.2,
    clip: { near: 0.005, far: 10 },
    light: [0.3, 0.6, 0.4],
  },
  'coil-tray': {
    Scene: CoilTrayScene,
    // The coil over its tray, the iron rod in front, the battery and the switch.
    frame: {
      center: [-0.005, 0.03, -0.008],
      halfSize: [0.185, 0.03, 0.1],
      azimuth: 24,
      elevation: 30,
      margin: 0.04,
    },
    zoom: { min: 0.2, max: 2.2 },
    pan: 0.2,
    clip: { near: 0.005, far: 10 },
    light: [0.3, 0.6, 0.4],
  },
  'coil-magnet': {
    Scene: CoilMagnetScene,
    // From the magnet's pusher at its farthest out, past the coil, to the meter and the LEDs.
    frame: {
      center: [-0.005, 0.04, 0],
      halfSize: [0.23, 0.04, 0.09],
      azimuth: 22,
      elevation: 28,
      margin: 0.04,
    },
    zoom: { min: 0.2, max: 2.2 },
    pan: 0.2,
    clip: { near: 0.005, far: 10 },
    light: [0.3, 0.6, 0.4],
  },
  'crank-generator': {
    Scene: CrankGeneratorScene,
    // The crank, magnet and coil, the meter and the LEDs.
    frame: {
      center: [0.06, 0.06, -0.005],
      halfSize: [0.14, 0.055, 0.1],
      azimuth: 24,
      elevation: 26,
      margin: 0.04,
    },
    zoom: { min: 0.2, max: 2.2 },
    pan: 0.2,
    clip: { near: 0.005, far: 10 },
    light: [0.3, 0.6, 0.4],
  },
};
