import { circuitCurrent, NO_SOURCES, stepBulbGlow, TORCH_BULB, vec3, type Vec3 } from '@/physics';
import { joinPaths, roundedPath } from '../shared/paths';
import type { CurrentPath, ModelDefinition, SimSnapshot } from '../types';

// Lesson 5's circuit: two cells in a holder, a knife switch and a torch bulb on a wooden board,
// joined by copper wires in plastic coating. Closing the switch completes the loop and the
// battery drives a current round it (Ohm's law); the bulb's filament glows with the current
// (physics core). Opening it breaks the loop and the current stops everywhere at once.

/** The board lies on the bench; its top is this high (m). */
export const BOARD = { width: 0.36, depth: 0.22, top: 0.012 } as const;
/** Two AA cells end to end: 3 V, with a little internal resistance (Ω). */
export const BATTERY = { x: -0.11, cellLength: 0.05, cellRadius: 0.007, cells: 2 } as const;
const EMF = 3;
const INTERNAL_RESISTANCE = 0.8;
/** The copper wires' own resistance (Ω): tiny beside the bulb's. */
const WIRE_RESISTANCE = 0.05;
export const SWITCH = { x: 0, z: 0.06, span: 0.044 } as const;
export const BULB = { x: 0.11 } as const;
/** Coated wires lie on the board, centred this high (m). */
const WIRE_Y = BOARD.top + 0.0016;

const BATTERY_HALF = (BATTERY.cellLength * BATTERY.cells) / 2;
const PLUS_END = vec3(BATTERY.x + BATTERY_HALF + 0.004, WIRE_Y, 0);
const MINUS_END = vec3(BATTERY.x - BATTERY_HALF - 0.004, WIRE_Y, 0);
const HINGE = vec3(SWITCH.x - SWITCH.span / 2, WIRE_Y, SWITCH.z);
const CONTACT = vec3(SWITCH.x + SWITCH.span / 2, WIRE_Y, SWITCH.z);
const BULB_IN = vec3(BULB.x, WIRE_Y, 0.016);
const BULB_OUT = vec3(BULB.x, WIRE_Y, -0.016);
/** The back wire runs this far behind the parts (z, m). */
const BACK = -0.07;

/** The three wires, each from end to end in the direction the current runs. */
export const WIRES = {
  toSwitch: roundedPath(
    [PLUS_END, vec3(-0.04, WIRE_Y, 0), vec3(-0.04, WIRE_Y, SWITCH.z), HINGE],
    0.012,
  ),
  toBulb: roundedPath([CONTACT, vec3(BULB.x, WIRE_Y, SWITCH.z), BULB_IN], 0.012),
  back: roundedPath(
    [
      BULB_OUT,
      vec3(BULB.x, WIRE_Y, BACK),
      vec3(MINUS_END.x - 0.014, WIRE_Y, BACK),
      vec3(MINUS_END.x - 0.014, WIRE_Y, 0),
      MINUS_END,
    ],
    0.014,
  ),
} as const;

/** The whole loop the current takes, round from the battery's + end and back through it. */
const LOOP: Vec3[] = joinPaths(
  WIRES.toSwitch,
  // Along the blade, from hinge to contact, at the top of the posts.
  [vec3(HINGE.x, BOARD.top + 0.016, SWITCH.z), vec3(CONTACT.x, BOARD.top + 0.016, SWITCH.z)],
  WIRES.toBulb,
  // Up into the bulb, through the filament and down again.
  [vec3(BULB.x, BOARD.top + 0.03, 0.003), vec3(BULB.x, BOARD.top + 0.03, -0.003)],
  WIRES.back,
  // Through the cells, from the - end to the + end.
  [
    vec3(MINUS_END.x, BOARD.top + BATTERY.cellRadius, 0),
    vec3(PLUS_END.x, BOARD.top + BATTERY.cellRadius, 0),
    PLUS_END,
  ],
);

export type CircuitBoardControls = {
  /** Whether the switch is closed. */
  readonly switch: boolean;
};

export interface CircuitBoardState {
  /** Current round the loop (A), positive from the battery's + end. */
  readonly current: number;
  /** How brightly the bulb glows: 0 dark, 1 at its rated current. */
  readonly glow: number;
  /** Whether current has flowed, and whether the switch has been opened again since. */
  readonly closedOnce: boolean;
  readonly openedAfterClosing: boolean;
}

export type CircuitBoardSnapshot = SimSnapshot<CircuitBoardState, CircuitBoardControls>;

/** The current with the switch closed: about a third of an amp. */
export const CLOSED_CURRENT = circuitCurrent(
  EMF,
  INTERNAL_RESISTANCE + WIRE_RESISTANCE + TORCH_BULB.resistance,
);

export const circuitBoard: ModelDefinition<CircuitBoardState, CircuitBoardControls> = {
  id: 'circuit-board',
  title: 'A battery, a switch and a bulb on a board, joined by copper wires in plastic coating',
  controls: {
    switch: {
      kind: 'switch',
      label: 'Switch',
      onLabel: 'Closed',
      offLabel: 'Open',
      default: false,
    },
  },
  // About three centimetres a second at a third of an amp.
  flowSpeed: 0.1,

  createState() {
    return { current: 0, glow: 0, closedOnce: false, openedAfterClosing: false };
  },

  step({ state, controls }, dt) {
    // The circuit's inductance is far too small to matter: the current switches at once.
    const current = controls.switch ? CLOSED_CURRENT : 0;
    const closedOnce = state.closedOnce || current > 0;
    return {
      current,
      glow: stepBulbGlow(state.glow, current, dt),
      closedOnce,
      openedAfterClosing: state.openedAfterClosing || (closedOnce && !controls.switch),
    };
  },

  readings: {},

  fieldSources() {
    return NO_SOURCES;
  },

  overlayRegion: {
    center: vec3(0, BOARD.top, 0),
    halfWidth: BOARD.width / 2,
    halfDepth: BOARD.depth / 2,
  },

  currentPaths({ state }): CurrentPath[] {
    return [{ points: LOOP, current: state.current }];
  },

  anchors: {
    battery: () => vec3(BATTERY.x, BOARD.top + 0.03, 0),
    switch: () => vec3(SWITCH.x, BOARD.top + 0.04, SWITCH.z),
    bulb: () => vec3(BULB.x, BOARD.top + 0.06, 0),
    wire: () => vec3(-0.02, WIRE_Y + 0.008, BACK),
  },
};

/** The bulb is lit: glowing at more than half its full brightness. */
export function bulbLit(state: CircuitBoardState): boolean {
  return state.glow > 0.5;
}

/** The switch was closed and then opened again, and the bulb has gone dark. */
export function openedAgain(state: CircuitBoardState): boolean {
  return state.openedAfterClosing && state.glow < 0.05;
}
