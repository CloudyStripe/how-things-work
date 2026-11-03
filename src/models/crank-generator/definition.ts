import {
  coilResistance,
  dipoleFluxLinkage,
  EAST,
  GALVANOMETER,
  inducedEmf,
  NO_SOURCES,
  RED_LED,
  rotatingMagnetDipole,
  SOFT_IRON_CORE,
  solveInductionCircuit,
  stepGalvanometerNeedle,
  UP,
  vec3,
  type Coil,
  type InductionCircuit,
  type NeedleState,
  type RotatingMagnet,
  type Vec3,
} from '@/physics';
import { joinPaths, roundedPath, windingPath } from '../shared/paths';
import type { CurrentPath, ModelDefinition, SimSnapshot } from '../types';

// Lesson 9's bench: a bar magnet on an upright shaft, turned by a crank on top, beside an
// iron-cored coil wired to the meter and the two LEDs from lesson 8. As the magnet spins, the
// flux through the coil swings one way and the other (physics core: the spinning magnet as a
// dipole, flux linkage by reciprocity, step-averaged emf), so the current keeps reversing.

/** The board lies on the bench; its top is this high (m). */
export const BOARD = { width: 0.4, depth: 0.26, top: 0.012 } as const;
/** The magnet spins in a level circle this high above the board, on a shaft at the origin. */
export const MAGNET_Y = BOARD.top + 0.045;
/** A strong (neodymium) bar magnet, 3 cm long and 10 mm across. */
export const MAGNET = { length: 0.03, side: 0.01 } as const;
const ROTOR: RotatingMagnet = {
  position: vec3(0, MAGNET_Y, 0),
  shaftAxis: UP,
  // At angle zero its N pole points at the coil, along +x.
  referenceDirection: EAST,
  moment: 2.5,
};

/** 3000 turns of fine copper (0.2 mm), 3 cm across and 4 cm long, on a soft-iron core. */
export const COIL: Coil = {
  center: vec3(0.045, MAGNET_Y, 0),
  axis: EAST,
  radius: 0.015,
  length: 0.04,
  turns: 3000,
  wireDiameter: 0.0002,
};
export const WINDING_DEPTH = 0.004;

/** The meter takes 4000 ohms with its series resistor, as in lesson 8. */
const CIRCUIT: InductionCircuit = {
  coilResistance: coilResistance(COIL),
  meterResistance: 4000,
  led: RED_LED,
};
export const METER = { x: 0.15, z: -0.07 } as const;
export const LEDS = { x: 0.15, z: 0.06 } as const;

/** Crank speeds (rotations per second): a slow, steady turn and a brisk one. */
export const CRANK_SPEEDS = { still: 0, slow: 0.5, fast: 1.2 } as const;
type CrankSetting = keyof typeof CRANK_SPEEDS;
/** A hand takes about this long (s) to bring the crank up to speed, or to stop it. */
const SPIN_UP = 0.4;
const SUBSTEP = 2e-3;
/** A needle swung this far (rad) each way counts as swinging back and forth. */
const SWUNG = 0.12;
const LIT = 0.25;

export type CrankGeneratorControls = {
  readonly crank: CrankSetting;
};

export interface CrankGeneratorState {
  /** The shaft's angle (rad) and how fast it turns (rotations per second). */
  readonly angle: number;
  readonly speed: number;
  readonly linkage: number;
  /** Averages over the last step. */
  readonly emf: number;
  readonly meterCurrent: number;
  readonly ledCurrent: number;
  readonly needle: NeedleState;
  /** While turning slowly, whether the needle has swung right and left. */
  readonly slowSwings: { readonly right: boolean; readonly left: boolean };
  /** While turning fast, whether each LED has lit. */
  readonly fastLit: { readonly red: boolean; readonly green: boolean };
}

export type CrankGeneratorSnapshot = SimSnapshot<CrankGeneratorState, CrankGeneratorControls>;

function linkageAt(angle: number): number {
  return dipoleFluxLinkage(COIL, rotatingMagnetDipole(ROTOR, angle), SOFT_IRON_CORE);
}

const WIRE_Y = BOARD.top + 0.0016;
const OUTER = COIL.radius + WINDING_DEPTH / 2;
/** The winding as drawn: twenty-four turns for the real three thousand. */
export const WINDING = windingPath(COIL.center, OUTER, COIL.length, 24);
const RIGHT_END = vec3(COIL.center.x + COIL.length / 2, MAGNET_Y, -OUTER);
const LEFT_END = vec3(COIL.center.x - COIL.length / 2, MAGNET_Y, -OUTER);
const BACK = -0.04;

export const WIRES = {
  toMeter: roundedPath(
    [
      RIGHT_END,
      vec3(RIGHT_END.x, MAGNET_Y, BACK),
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
      vec3(METER.x + 0.05, WIRE_Y, BACK - 0.06),
      vec3(LEFT_END.x, WIRE_Y, BACK - 0.06),
      vec3(LEFT_END.x, MAGNET_Y, BACK - 0.06),
      LEFT_END,
    ],
    0.01,
  ),
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

// As in lesson 8: positive emf drives current along the winding as drawn, out of its left end.
const reversed = (points: readonly Vec3[]) => [...points].reverse();
const OUT_OF_COIL = joinPaths(WINDING, reversed(WIRES.fromMeter));
const THROUGH_METER = [
  vec3(METER.x + 0.03, WIRE_Y, METER.z),
  vec3(METER.x - 0.03, WIRE_Y, METER.z),
];
const THROUGH_LEDS = joinPaths(reversed(WIRES.fromLeds), reversed(WIRES.toLeds));
const BACK_TO_COIL = reversed(WIRES.toMeter);

export const crankGenerator: ModelDefinition<CrankGeneratorState, CrankGeneratorControls> = {
  id: 'crank-generator',
  title: 'A bar magnet spun by a hand crank beside a coil wired to a meter and two LEDs',
  controls: {
    crank: {
      kind: 'choice',
      label: 'Crank',
      options: [
        { value: 'still', label: 'Still' },
        { value: 'slow', label: 'Slow' },
        { value: 'fast', label: 'Fast' },
      ],
      default: 'still',
    },
  },
  flowSpeed: 40,

  createState() {
    return {
      angle: 0,
      speed: 0,
      linkage: linkageAt(0),
      emf: 0,
      meterCurrent: 0,
      ledCurrent: 0,
      needle: { angle: 0, angularVelocity: 0 },
      slowSwings: { right: false, left: false },
      fastLit: { red: false, green: false },
    };
  },

  step({ state, controls }, dt) {
    const target = CRANK_SPEEDS[controls.crank];
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
    const h = dt / steps;
    let { angle, speed, linkage, needle } = state;
    let emfSum = 0;
    let meterSum = 0;
    let ledSum = 0;
    let red = false;
    let green = false;
    for (let i = 0; i < steps; i++) {
      // The hand brings the crank to speed over a moment, exactly for any step.
      speed = target + (speed - target) * Math.exp(-h / SPIN_UP);
      angle += 2 * Math.PI * speed * h;
      const next = linkageAt(angle);
      const emf = inducedEmf(linkage, next, h);
      const circuit = solveInductionCircuit(emf, CIRCUIT);
      needle = stepGalvanometerNeedle(needle, circuit.meterCurrent, h, GALVANOMETER);
      linkage = next;
      emfSum += emf;
      meterSum += circuit.meterCurrent;
      ledSum += circuit.ledCurrent;
      if (circuit.ledCurrent > LIT * RED_LED.ratedCurrent) green = true;
      if (circuit.ledCurrent < -LIT * RED_LED.ratedCurrent) red = true;
    }
    const slow = controls.crank === 'slow';
    const fast = controls.crank === 'fast';
    return {
      angle: angle % (2 * Math.PI),
      speed,
      linkage,
      emf: emfSum / steps,
      meterCurrent: meterSum / steps,
      ledCurrent: ledSum / steps,
      needle,
      slowSwings: {
        right: state.slowSwings.right || (slow && needle.angle > SWUNG),
        left: state.slowSwings.left || (slow && needle.angle < -SWUNG),
      },
      fastLit: {
        red: state.fastLit.red || (fast && red),
        green: state.fastLit.green || (fast && green),
      },
    };
  },

  readings: {},

  fieldSources({ state }) {
    const dipole = rotatingMagnetDipole(ROTOR, state.angle);
    const length = Math.hypot(dipole.moment.x, dipole.moment.y, dipole.moment.z);
    return {
      ...NO_SOURCES,
      magnets: [
        {
          center: ROTOR.position,
          axis: vec3(dipole.moment.x / length, dipole.moment.y / length, dipole.moment.z / length),
          radius: MAGNET.side / 2,
          length: MAGNET.length,
          moment: ROTOR.moment,
        },
      ],
    };
  },

  overlayRegion: { center: vec3(0.03, MAGNET_Y, 0), halfWidth: 0.12, halfDepth: 0.08 },

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
    crank: () => vec3(0, MAGNET_Y + 0.07, 0),
    magnet: () => vec3(0, MAGNET_Y + 0.02, 0),
    coil: () => vec3(COIL.center.x, MAGNET_Y + 0.035, 0),
    meter: () => vec3(METER.x, BOARD.top + 0.085, METER.z),
    leds: () => vec3(LEDS.x, BOARD.top + 0.03, LEDS.z),
  },
};

/** How brightly each LED glows (0 to 1): positive current lights the green one. */
export function ledBrightness(state: CrankGeneratorState): { red: number; green: number } {
  const share = Math.min(1, Math.abs(state.ledCurrent) / RED_LED.ratedCurrent);
  return state.ledCurrent > 0 ? { red: 0, green: share } : { red: share, green: 0 };
}
