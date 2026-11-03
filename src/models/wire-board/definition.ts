import {
  circuitCurrent,
  COMPASS_NEEDLE,
  netField,
  NO_SOURCES,
  stepCompassNeedle,
  UP,
  vec3,
  type FieldSources,
  type NeedleState,
  type Vec3,
} from '@/physics';
import { joinPaths, roundedPath } from '../shared/paths';
import type { CurrentPath, ModelDefinition, SimSnapshot } from '../types';

// Lesson 6's bench: a tall copper wire passes up through a hole in a raised board, with small
// compasses on the board around it. A single cell drives a large current through the wire when
// the switch closes; each needle turns by the physics core (stepCompassNeedle) in the wire's
// field plus Earth's. Reversing the battery reverses the current.
//
// Only the tall wire's field counts. Its leads run far off (over the top, down at the left and
// back under the board), and compasses sit close beside the wire, where the long-wire field
// holds (docs/physics-model.md).

/** The board stands on legs so the wire can pass through it; its top is this high (m). */
export const BOARD = { width: 0.34, depth: 0.3, top: 0.062, thickness: 0.012 } as const;
/** The wire rises through the board's centre to this height above its top (m). */
export const WIRE_TOP = BOARD.top + 0.35;
/** Bare copper, 3 mm across. */
const WIRE_RADIUS = 0.0015;
/** One D cell: 1.5 V, a tenth of an ohm inside; the thick wire adds a twentieth. */
export const BATTERY = { x: -0.1, z: -0.125, cellLength: 0.061, cellRadius: 0.017 } as const;
const EMF = 1.5;
const RESISTANCE = 0.1 + 0.05;
export const SWITCH = { x: 0.04, z: -0.125, span: 0.044 } as const;

/** Plotting compasses: 22 mm across, needle 8 mm up. */
export const COMPASS = { radius: 0.011, needleHeight: 0.008 } as const;

/**
 * Eight compasses close round the wire, four farther out, and four farther still. None sits due
 * east or west of the wire: there, reversing the current would turn the field exactly round, and
 * a needle balanced exactly backwards never starts to swing. A real one is never quite so exact.
 */
export const COMPASSES: readonly Vec3[] = [
  ...ring(0.035, 8, Math.PI / 8),
  ...ring(0.075, 4, Math.PI / 6),
  ...ring(0.12, 4, Math.PI / 4),
];

function ring(radius: number, count: number, start: number): Vec3[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = start + (index * 2 * Math.PI) / count;
    return vec3(
      radius * Math.cos(angle),
      BOARD.top + COMPASS.needleHeight,
      radius * Math.sin(angle),
    );
  });
}

const WIRE_Y = BOARD.top + 0.0016;
const BATTERY_HALF = BATTERY.cellLength / 2;
/** Where the leads join the battery's two ends, wherever round it faces. */
const RIGHT_END = vec3(BATTERY.x + BATTERY_HALF + 0.004, WIRE_Y, BATTERY.z);
const LEFT_END = vec3(BATTERY.x - BATTERY_HALF - 0.004, WIRE_Y, BATTERY.z);
const HINGE = vec3(SWITCH.x - SWITCH.span / 2, WIRE_Y, SWITCH.z);
const CONTACT = vec3(SWITCH.x + SWITCH.span / 2, WIRE_Y, SWITCH.z);
const UNDER = BOARD.top - BOARD.thickness - 0.02;
const EDGE = BOARD.width / 2 + 0.006;
/** The far lead comes down beyond the board's left edge (x, m). */
const FAR_SIDE = -0.26;

/** The wires, in the order a forward current runs through them. */
export const WIRES = {
  /** From the battery's right end through the switch's hinge. */
  toSwitch: roundedPath([RIGHT_END, HINGE], 0.01),
  /** From the switch's contact, over the board's right edge and back under it to the centre. */
  under: roundedPath(
    [
      CONTACT,
      vec3(EDGE, WIRE_Y, SWITCH.z),
      vec3(EDGE, UNDER, SWITCH.z),
      vec3(EDGE, UNDER, 0),
      vec3(0, UNDER, 0),
    ],
    0.015,
  ),
  /** Up through the board: the bare copper wire the compasses ring. */
  tall: [vec3(0, UNDER, 0), vec3(0, WIRE_TOP, 0)],
  /** Over the top, down beyond the board's left edge and back to the battery's left end. */
  back: roundedPath(
    [
      vec3(0, WIRE_TOP, 0),
      vec3(FAR_SIDE, WIRE_TOP, 0),
      vec3(FAR_SIDE, WIRE_Y, 0),
      vec3(FAR_SIDE, WIRE_Y, BATTERY.z),
      LEFT_END,
    ],
    0.03,
  ),
} as const;

const LOOP: Vec3[] = joinPaths(
  WIRES.toSwitch,
  [vec3(HINGE.x, BOARD.top + 0.016, SWITCH.z), vec3(CONTACT.x, BOARD.top + 0.016, SWITCH.z)],
  WIRES.under,
  WIRES.tall,
  WIRES.back,
  // Through the cell, from its left end to its right end.
  [vec3(LEFT_END.x, BOARD.top + BATTERY.cellRadius, BATTERY.z), RIGHT_END],
);

export type WireBoardControls = {
  readonly switch: boolean;
  /** Whether the battery is turned round, sending the current down the wire instead of up. */
  readonly battery: boolean;
};

export interface WireBoardState {
  /** Current up the tall wire (A); negative when it flows down. */
  readonly current: number;
  readonly needles: readonly NeedleState[];
  /** Whether current has flowed up the wire, and down it. */
  readonly flowedUp: boolean;
  readonly flowedDown: boolean;
  /** Whether the switch has been opened after current flowed both ways. */
  readonly openedAfterBoth: boolean;
}

export type WireBoardSnapshot = SimSnapshot<WireBoardState, WireBoardControls>;

/** Ten amps: about as much as a fresh cell drives through a short, thick wire. */
export const CLOSED_CURRENT = circuitCurrent(EMF, RESISTANCE);

function sources(current: number): FieldSources {
  return {
    ...NO_SOURCES,
    wires: [{ point: vec3(0, 0, 0), direction: UP, radius: WIRE_RADIUS, current }],
    earth: true,
  };
}

export const wireBoard: ModelDefinition<WireBoardState, WireBoardControls> = {
  id: 'wire-board',
  title: 'A tall copper wire through a board ringed with compasses, with a battery and a switch',
  controls: {
    switch: {
      kind: 'switch',
      label: 'Switch',
      onLabel: 'Closed',
      offLabel: 'Open',
      default: false,
    },
    battery: {
      kind: 'switch',
      label: 'Battery',
      onLabel: 'Reversed',
      offLabel: 'Forward',
      default: false,
    },
  },
  // About four centimetres a second at ten amps.
  flowSpeed: 0.004,

  createState() {
    // At rest, every needle points north.
    return {
      current: 0,
      needles: COMPASSES.map(() => ({ angle: 0, angularVelocity: 0 })),
      flowedUp: false,
      flowedDown: false,
      openedAfterBoth: false,
    };
  },

  step({ state, controls }, dt) {
    const current = controls.switch ? (controls.battery ? -CLOSED_CURRENT : CLOSED_CURRENT) : 0;
    const field = sources(current);
    const needles = COMPASSES.map((at, index) =>
      stepCompassNeedle(
        state.needles[index] ?? { angle: 0, angularVelocity: 0 },
        netField(field, at),
        dt,
        COMPASS_NEEDLE,
      ),
    );
    const flowedUp = state.flowedUp || current > 0;
    const flowedDown = state.flowedDown || current < 0;
    return {
      current,
      needles,
      flowedUp,
      flowedDown,
      openedAfterBoth: state.openedAfterBoth || (flowedUp && flowedDown && !controls.switch),
    };
  },

  readings: {},

  fieldSources({ state }) {
    return sources(state.current);
  },

  // Field overlays draw across the board, at the compass needles' height.
  overlayRegion: {
    center: vec3(0, BOARD.top + COMPASS.needleHeight, 0),
    halfWidth: BOARD.width / 2,
    halfDepth: BOARD.depth / 2,
  },

  currentPaths({ state }): CurrentPath[] {
    return [{ points: LOOP, current: state.current }];
  },

  anchors: {
    wire: () => vec3(0, BOARD.top + 0.09, 0),
    compasses: () => vec3(0.075, BOARD.top + 0.02, 0),
    battery: () => vec3(BATTERY.x, BOARD.top + 0.045, BATTERY.z),
    switch: () => vec3(SWITCH.x, BOARD.top + 0.04, SWITCH.z),
  },
};

/** How far a needle points from north (rad, 0 to π). */
export function offNorth(needle: NeedleState): number {
  const angle = Math.abs(needle.angle) % (2 * Math.PI);
  return Math.min(angle, 2 * Math.PI - angle);
}

/** Every needle is back within a little of north. */
export function allNorth(state: WireBoardState): boolean {
  return state.needles.every((needle) => offNorth(needle) < 0.2);
}
