import {
  barMagnetWinding,
  coaxialFluxLinkage,
  coilResistance,
  EAST,
  GALVANOMETER,
  inducedEmf,
  NO_SOURCES,
  RED_LED,
  solveInductionCircuit,
  stepGalvanometerNeedle,
  vec3,
  type BarMagnet,
  type Coil,
  type InductionCircuit,
  type NeedleState,
  type Vec3,
} from '@/physics';
import { joinPaths, roundedPath, windingPath } from '../shared/paths';
import type { CurrentPath, ModelDefinition, SimSnapshot } from '../types';

// Lesson 8's bench: a coil lying along x, wired to a centre-zero meter and to a red and a green
// LED wired opposite ways. The learner slides a strong bar magnet along the coil's axis, into it
// and out. Faraday's law (physics core: coaxial flux linkage, step-averaged emf) gives the emf;
// the circuit splits its current between the meter and, past their forward voltage, the LEDs.

/** The board lies on the bench; its top is this high (m). */
export const BOARD = { width: 0.46, depth: 0.24, top: 0.012 } as const;
/** The coil's axis runs along x, this high (m). */
export const AXIS_Y = BOARD.top + 0.032;

/** 2000 turns of fine copper (0.15 mm), 4 cm across and 5 cm long: about 240 ohms. */
export const COIL: Coil = {
  center: vec3(0.06, AXIS_Y, 0),
  axis: EAST,
  radius: 0.02,
  length: 0.05,
  turns: 2000,
  wireDiameter: 0.00015,
};
/** How thick the winding is drawn, outside its mean radius (m). */
export const WINDING_DEPTH = 0.004;

/** A strong (neodymium) bar magnet, 5 cm long and 12 mm across, its N pole toward the coil. */
export const MAGNET = { length: 0.05, side: 0.012 } as const;
const MAGNET_RADIUS = 0.006;
const MAGNET_MOMENT = 6.5;
/** The magnet's centre slides from well clear of the coil to the coil's middle (x, m). */
export const MAGNET_TRAVEL = { min: -0.2, max: COIL.center.x } as const;

/**
 * The meter, with its series resistor, takes 4000 ohms: full scale (500 µA) at 2 V, just past
 * where the LEDs light.
 */
const CIRCUIT: InductionCircuit = {
  coilResistance: coilResistance(COIL),
  meterResistance: 4000,
  led: RED_LED,
};
export const METER = { x: 0.19, z: -0.06 } as const;
export const LEDS = { x: 0.19, z: 0.06 } as const;

/** Physics substep (s): a quick push changes the flux within a few milliseconds. */
const SUBSTEP = 1e-3;
/** Held still inside this long (s) counts as still. */
const STILL_FOR = 1;
/** An LED lit to a quarter of full brightness counts as lit. */
const LIT = 0.25;

export type CoilMagnetControls = {
  /** Where the magnet is, from 0 (out) to 1 (all the way in). */
  readonly position: number;
};

export interface CoilMagnetState {
  /** Centre of the magnet along the coil's axis (m). */
  readonly magnet: number;
  /** Flux linkage through the coil (Wb), carried from step to step. */
  readonly linkage: number;
  /** Averages over the last step: the coil's emf (V), the meter's and the LEDs' currents (A). */
  readonly emf: number;
  readonly meterCurrent: number;
  readonly ledCurrent: number;
  readonly needle: NeedleState;
  /** Whether the magnet has been pushed into the coil, and pulled right out again since. */
  readonly pushedIn: boolean;
  readonly pulledOut: boolean;
  /** How long (s) the magnet has sat still inside the coil. */
  readonly stillInside: number;
  readonly ledLit: boolean;
}

export type CoilMagnetSnapshot = SimSnapshot<CoilMagnetState, CoilMagnetControls>;

export function magnetPosition(slider: number): number {
  const clamped = Math.min(1, Math.max(0, slider));
  return MAGNET_TRAVEL.min + clamped * (MAGNET_TRAVEL.max - MAGNET_TRAVEL.min);
}

function magnetAt(x: number): BarMagnet {
  return {
    center: vec3(x, AXIS_Y, 0),
    axis: EAST,
    radius: MAGNET_RADIUS,
    length: MAGNET.length,
    moment: MAGNET_MOMENT,
  };
}

function linkageAt(x: number): number {
  return coaxialFluxLinkage(barMagnetWinding(magnetAt(x)), COIL);
}

const WIRE_Y = BOARD.top + 0.0016;
const OUTER = COIL.radius + WINDING_DEPTH / 2;
const RIGHT_END = vec3(COIL.center.x + COIL.length / 2, AXIS_Y, -OUTER);
const LEFT_END = vec3(COIL.center.x - COIL.length / 2, AXIS_Y, -OUTER);
/** The winding as drawn: thirty turns for the real two thousand. */
export const WINDING = windingPath(COIL.center, OUTER, COIL.length, 30);
const BACK = -0.045;

export const WIRES = {
  /** From the coil's right end to the meter, then from the meter back to the coil's left end. */
  toMeter: roundedPath(
    [
      RIGHT_END,
      vec3(RIGHT_END.x, AXIS_Y, BACK),
      vec3(RIGHT_END.x, WIRE_Y, BACK),
      vec3(METER.x - 0.03, WIRE_Y, BACK),
      vec3(METER.x - 0.03, WIRE_Y, METER.z),
    ],
    0.01,
  ),
  fromMeter: roundedPath(
    [
      vec3(METER.x + 0.03, WIRE_Y, METER.z),
      vec3(METER.x + 0.05, WIRE_Y, METER.z),
      vec3(METER.x + 0.05, WIRE_Y, BACK - 0.03),
      vec3(LEFT_END.x, WIRE_Y, BACK - 0.03),
      vec3(LEFT_END.x, AXIS_Y, BACK - 0.03),
      LEFT_END,
    ],
    0.01,
  ),
  /** The LEDs, joined across the meter's two terminals. */
  toLeds: roundedPath(
    [vec3(METER.x - 0.03, WIRE_Y, METER.z), vec3(LEDS.x - 0.025, WIRE_Y, LEDS.z)],
    0.01,
  ),
  fromLeds: roundedPath(
    [
      vec3(LEDS.x + 0.025, WIRE_Y, LEDS.z),
      vec3(METER.x + 0.05, WIRE_Y, LEDS.z),
      vec3(METER.x + 0.05, WIRE_Y, METER.z),
    ],
    0.01,
  ),
} as const;

// Positive emf drives current along the winding as drawn (right end to left), out of the
// coil's left end, round through the meter or the LEDs, and back into its right end.
const reversed = (points: readonly Vec3[]) => [...points].reverse();
/** Through the coil and on to the meter's right-hand terminal: the whole current. */
const OUT_OF_COIL = joinPaths(WINDING, reversed(WIRES.fromMeter));
/** Across the meter, right-hand terminal to left. */
const THROUGH_METER = [
  vec3(METER.x + 0.03, WIRE_Y, METER.z),
  vec3(METER.x - 0.03, WIRE_Y, METER.z),
];
/** Round through the LEDs, from the meter's right-hand terminal to its left. */
const THROUGH_LEDS = joinPaths(reversed(WIRES.fromLeds), reversed(WIRES.toLeds));
/** From the meter's left-hand terminal back into the coil: the whole current again. */
const BACK_TO_COIL = reversed(WIRES.toMeter);

export const coilMagnet: ModelDefinition<CoilMagnetState, CoilMagnetControls> = {
  id: 'coil-magnet',
  title: 'A bar magnet sliding into a coil wired to a centre-zero meter and two LEDs',
  controls: {
    position: { kind: 'slider', label: 'Magnet', minLabel: 'Out', maxLabel: 'In', default: 0 },
  },
  fluxCoil: COIL,
  // Dots crawl at the meter's fraction of a milliamp, and dash when the LEDs flash.
  flowSpeed: 40,

  createState(controls) {
    const magnet = magnetPosition(controls.position);
    return {
      magnet,
      linkage: linkageAt(magnet),
      emf: 0,
      meterCurrent: 0,
      ledCurrent: 0,
      needle: { angle: 0, angularVelocity: 0 },
      pushedIn: false,
      pulledOut: false,
      stillInside: 0,
      ledLit: false,
    };
  },

  step({ state, controls }, dt) {
    // The hand moves the magnet; spread the move over the frame so a quick push still changes
    // the flux smoothly.
    const target = magnetPosition(controls.position);
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
    const h = dt / steps;
    let { linkage, needle } = state;
    let emfSum = 0;
    let meterSum = 0;
    let ledSum = 0;
    let ledPeak = 0;
    for (let i = 1; i <= steps; i++) {
      const x = state.magnet + ((target - state.magnet) * i) / steps;
      const next = linkageAt(x);
      const emf = inducedEmf(linkage, next, h);
      const circuit = solveInductionCircuit(emf, CIRCUIT);
      needle = stepGalvanometerNeedle(needle, circuit.meterCurrent, h, GALVANOMETER);
      linkage = next;
      emfSum += emf;
      meterSum += circuit.meterCurrent;
      ledSum += circuit.ledCurrent;
      ledPeak = Math.max(ledPeak, Math.abs(circuit.ledCurrent));
    }

    const moving = target - state.magnet;
    const inside = Math.abs(target - COIL.center.x) < 0.012;
    const pushedIn = state.pushedIn || target > COIL.center.x - COIL.length / 2;
    const clear = target < COIL.center.x - COIL.length / 2 - MAGNET.length / 2;
    return {
      magnet: target,
      linkage,
      emf: emfSum / steps,
      meterCurrent: meterSum / steps,
      ledCurrent: ledSum / steps,
      needle,
      pushedIn,
      pulledOut: state.pulledOut || (state.pushedIn && clear),
      stillInside: inside && moving === 0 ? state.stillInside + dt : 0,
      ledLit: state.ledLit || ledPeak > LIT * RED_LED.ratedCurrent,
    };
  },

  readings: {},

  fieldSources({ state }) {
    // The coil's own field from its tiny induced current is left out.
    return { ...NO_SOURCES, magnets: [magnetAt(state.magnet)] };
  },

  // Field overlays draw in the level through the coil's axis.
  overlayRegion: { center: vec3(-0.02, AXIS_Y, 0), halfWidth: 0.22, halfDepth: 0.08 },

  currentPaths({ state }): CurrentPath[] {
    const whole = state.meterCurrent + state.ledCurrent;
    return [
      { points: OUT_OF_COIL, current: whole },
      { points: THROUGH_METER, current: state.meterCurrent },
      { points: THROUGH_LEDS, current: state.ledCurrent },
      { points: BACK_TO_COIL, current: whole },
    ];
  },

  anchors: {
    magnet: ({ state }) => vec3(state.magnet, AXIS_Y + 0.025, 0),
    coil: () => vec3(COIL.center.x, AXIS_Y + 0.04, 0),
    meter: () => vec3(METER.x, BOARD.top + 0.085, METER.z),
    leds: () => vec3(LEDS.x, BOARD.top + 0.03, LEDS.z),
  },
};

/** How brightly each LED glows (0 to 1): positive current lights the green one. */
export function ledBrightness(state: CoilMagnetState): { red: number; green: number } {
  const share = Math.min(1, Math.abs(state.ledCurrent) / RED_LED.ratedCurrent);
  return state.ledCurrent > 0 ? { red: 0, green: share } : { red: share, green: 0 };
}

/** The magnet has sat still inside the coil long enough, and the needle rests at zero. */
export function stillAndZero(state: CoilMagnetState): boolean {
  return state.stillInside >= STILL_FOR && Math.abs(state.needle.angle) < 0.03;
}
