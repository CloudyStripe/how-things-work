import {
  compassBearing,
  EAST,
  length,
  netField,
  NO_SOURCES,
  stepCompassNeedle,
  sub,
  vec3,
  type BarMagnet,
  type FieldSources,
  type NeedleState,
  type Vec3,
} from '@/physics';
import type { ModelDefinition, SimSnapshot, Spot } from '../types';

// Lesson 4's bench: a bar magnet lying east to west, and a compass the learner moves anywhere on
// the bench. The needle turns by the physics core (stepCompassNeedle) in the net field where the
// compass sits: the magnet's plus Earth's. Near the magnet the magnet wins; far from it Earth's
// field does, and the needle points north (-z, away from the learner).

/**
 * A small, weak bar magnet: 5 cm long, 12 mm across. Its field matches Earth's about 12 cm out
 * from its side and 15 cm out from its ends; across the bench, where the compass starts, it
 * turns the needle about four degrees off north.
 */
export const MAGNET = { length: 0.05, side: 0.012 } as const;
const MAGNET_RADIUS = 0.006;
const MAGNET_MOMENT = 0.4;
export const MAGNET_HEIGHT = MAGNET.side / 2;
/** The magnet lies here, its N pole to the east (+x, the learner's right). */
export const MAGNET_X = -0.12;

/** A demonstration compass, 8 cm across, its needle this high above the bench (m). */
export const COMPASS = { radius: 0.04, needleHeight: 0.013 } as const;
/** The compass's centre stays inside this area of the bench (m). */
export const AREA = { minX: -0.22, maxX: 0.26, minZ: -0.12, maxZ: 0.12 } as const;

/** Where the arrow printed on the bench, pointing north, sits (m). */
export const NORTH_MARK = { x: AREA.maxX + 0.02, z: AREA.minZ - 0.03 } as const;

/** Within this distance (m) of a pole, the compass counts as beside it. */
const BESIDE_POLE = 0.09;
/** From this far from the magnet (m), the compass counts as far away. */
const FAR = 0.32;
/** A needle this close to north (rad), and this still (rad/s), counts as pointing north. */
const NORTH_TOLERANCE = 0.12;
const STILL = 0.5;

export type CompassBenchControls = {
  /** Where the compass sits on the bench. */
  readonly compass: Spot;
};

export interface CompassBenchState {
  /** The compass's centre on the bench (m); y is the needle's height. */
  readonly compass: Vec3;
  readonly needle: NeedleState;
  /** Whether the compass has been beside each of the magnet's poles. */
  readonly visitedNorth: boolean;
  readonly visitedSouth: boolean;
}

export type CompassBenchSnapshot = SimSnapshot<CompassBenchState, CompassBenchControls>;

const MAGNET_ON_BENCH: BarMagnet = {
  center: vec3(MAGNET_X, MAGNET_HEIGHT, 0),
  axis: EAST,
  radius: MAGNET_RADIUS,
  length: MAGNET.length,
  moment: MAGNET_MOMENT,
};

const SOURCES: FieldSources = { ...NO_SOURCES, magnets: [MAGNET_ON_BENCH], earth: true };

export const NORTH_POLE = vec3(MAGNET_X + MAGNET.length / 2, COMPASS.needleHeight, 0);
export const SOUTH_POLE = vec3(MAGNET_X - MAGNET.length / 2, COMPASS.needleHeight, 0);

/**
 * Where a spot puts the compass: inside the bench area, and pushed out of the magnet's way (the
 * compass cannot sit on top of it).
 */
export function compassPosition(spot: Spot): Vec3 {
  const across = Math.min(1, Math.max(0, spot.across));
  const depth = Math.min(1, Math.max(0, spot.depth));
  let x = AREA.minX + across * (AREA.maxX - AREA.minX);
  let z = AREA.minZ + depth * (AREA.maxZ - AREA.minZ);
  const clearX = MAGNET.length / 2 + COMPASS.radius;
  const clearZ = MAGNET.side / 2 + COMPASS.radius;
  const dx = x - MAGNET_X;
  if (Math.abs(dx) < clearX && Math.abs(z) < clearZ) {
    // Out by the shorter way: to the nearer end, or to the nearer side.
    if (clearX - Math.abs(dx) < clearZ - Math.abs(z)) x = MAGNET_X + Math.sign(dx || 1) * clearX;
    else z = Math.sign(z || 1) * clearZ;
  }
  return vec3(x, COMPASS.needleHeight, z);
}

/** The spot that puts the compass at x, z: the inverse of compassPosition inside the area. */
export function spotAt(x: number, z: number): Spot {
  return {
    across: (x - AREA.minX) / (AREA.maxX - AREA.minX),
    depth: (z - AREA.minZ) / (AREA.maxZ - AREA.minZ),
  };
}

function fieldAt(point: Vec3): Vec3 {
  return netField(SOURCES, point);
}

function visits(state: Pick<CompassBenchState, 'compass' | 'visitedNorth' | 'visitedSouth'>) {
  return {
    visitedNorth: state.visitedNorth || length(sub(state.compass, NORTH_POLE)) < BESIDE_POLE,
    visitedSouth: state.visitedSouth || length(sub(state.compass, SOUTH_POLE)) < BESIDE_POLE,
  };
}

export const compassBench: ModelDefinition<CompassBenchState, CompassBenchControls> = {
  id: 'compass-bench',
  title: 'A compass on a bench beside a bar magnet',
  controls: {
    compass: {
      kind: 'spot',
      label: 'Compass',
      acrossLabels: ['Left', 'Right'],
      depthLabels: ['Back', 'Front'],
      default: spotAt(0.24, 0.02),
    },
  },

  createState(controls) {
    const compass = compassPosition(controls.compass);
    // It starts at rest, already settled where it sits.
    const angle = compassBearing(fieldAt(compass)) ?? 0;
    return {
      compass,
      needle: { angle, angularVelocity: 0 },
      ...visits({ compass, visitedNorth: false, visitedSouth: false }),
    };
  },

  step({ state, controls }, dt) {
    const compass = compassPosition(controls.compass);
    const needle = stepCompassNeedle(state.needle, fieldAt(compass), dt);
    return { compass, needle, ...visits({ ...state, compass }) };
  },

  readings: {},

  fieldSources() {
    return SOURCES;
  },

  // Field overlays draw across the whole bench area, at the height of the magnet's middle.
  overlayRegion: {
    center: vec3(0, MAGNET_HEIGHT, 0),
    halfWidth: AREA.maxX + COMPASS.radius,
    halfDepth: AREA.maxZ + COMPASS.radius,
  },

  anchors: {
    magnet: () => vec3(MAGNET_X, MAGNET.side + 0.012, 0),
    compass: ({ state }) => vec3(state.compass.x, 0.03, state.compass.z),
    north: () => vec3(NORTH_MARK.x, 0.012, NORTH_MARK.z),
  },
};

/** The compass is beside the magnet's north (red) end. */
export function besideNorthPole(state: CompassBenchState): boolean {
  return length(sub(state.compass, NORTH_POLE)) < BESIDE_POLE;
}

/** The compass is beside the magnet's south (blue) end. */
export function besideSouthPole(state: CompassBenchState): boolean {
  return length(sub(state.compass, SOUTH_POLE)) < BESIDE_POLE;
}

/** How far the needle's north end points from north (rad, 0 to π). */
export function needleOffNorth(state: CompassBenchState): number {
  const angle = Math.abs(state.needle.angle) % (2 * Math.PI);
  return Math.min(angle, 2 * Math.PI - angle);
}

/** Far from the magnet, settled and pointing north. */
export function farAndPointingNorth(state: CompassBenchState): boolean {
  const distance = length(sub(state.compass, vec3(MAGNET_X, COMPASS.needleHeight, 0)));
  return (
    distance >= FAR &&
    needleOffNorth(state) <= NORTH_TOLERANCE &&
    Math.abs(state.needle.angularVelocity) <= STILL
  );
}
