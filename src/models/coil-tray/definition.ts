import {
  circuitCurrent,
  coilResistance,
  EAST,
  electromagnetWinding,
  magnetizableBody,
  NO_SOURCES,
  softIronForce,
  SOFT_IRON_CORE,
  vec3,
  windingField,
  ZERO,
  type Coil,
  type FieldSources,
  type Vec3,
} from '@/physics';
import { joinPaths, roundedPath, windingPath } from '../shared/paths';
import type { CurrentPath, ModelDefinition, SimSnapshot } from '../types';

// Lesson 7's bench: a coil of copper wire lying along x, held above a tray of paper clips, wired
// to a battery through a switch. With current, the coil is a magnet (physics core: a winding),
// and with the soft-iron core pushed in, its field is far stronger (electromagnetWinding). Each
// clip is pulled as softIronForce says; one lifts when the upward pull beats its weight, and
// hangs from the end it jumped to until the pull there no longer holds it.

/** The board lies on the bench; its top is this high (m). */
export const BOARD = { width: 0.4, depth: 0.26, top: 0.012 } as const;
/** The tray's floor, and its inside: 12 cm by 7 cm. */
export const TRAY = { floor: BOARD.top + 0.003, halfWidth: 0.06, halfDepth: 0.035, wall: 0.008 };
/** The coil's axis runs along x, this high (m): 22 mm above the tray's floor. */
export const AXIS_Y = TRAY.floor + 0.022;

const COIL_LENGTH = 0.06;
/** 200 turns of 0.5 mm copper, 24 mm across and 6 cm long: about 1.3 ohms. */
export const COIL: Coil = {
  center: vec3(0, AXIS_Y, 0),
  axis: EAST,
  radius: 0.012,
  length: COIL_LENGTH,
  turns: 200,
  wireDiameter: 0.0005,
};
/** How thick the winding is drawn, outside its mean radius (m). */
export const WINDING_DEPTH = 0.0025;
/**
 * A soft-iron rod 11 mm across, as long as the coil: the field model makes the cored coil a
 * stronger copy of itself, so the core ends where the coil does.
 */
export const CORE = { radius: 0.0055, length: COIL_LENGTH + 0.002 } as const;
/** Out of the coil, the core lies on the board in front of the tray (z, m). */
export const CORE_OUT_Z = 0.08;

/** Three AA cells: 4.5 V, with a little internal resistance (Ω). */
export const BATTERY = { x: -0.1, z: -0.095, cellLength: 0.05, cellRadius: 0.007, cells: 3 };
const EMF = 4.5;
const INTERNAL_RESISTANCE = 0.6;
export const SWITCH = { x: 0.12, z: 0, span: 0.044 } as const;

/** About two and a half amps with the switch closed. */
export const CLOSED_CURRENT = circuitCurrent(EMF, INTERNAL_RESISTANCE + coilResistance(COIL));

/** A steel paper clip: about 0.4 g, 32 mm long. */
const CLIP_BODY = magnetizableBody('steel', 5e-8);
const CLIP_MASS = 4e-4;
const GRAVITY = 9.81;
const WEIGHT = CLIP_MASS * GRAVITY;
export const CLIP = { length: 0.032, width: 0.008, thickness: 0.0009 } as const;
const CLIP_COUNT = 30;
/** How many clips can hang from each end, side by side. */
const SLOTS_PER_END = 8;
/** Lifting and falling clips move in substeps this long (s). */
const SUBSTEP = 2e-3;

export type CoilTrayControls = {
  readonly switch: boolean;
  /** Whether the iron core is pushed into the coil. */
  readonly core: boolean;
};

export interface TrayClip {
  readonly position: Vec3;
  /** Speed along its path while rising or falling (m/s). */
  readonly speed: number;
  /** Its bearing lying in the tray (rad). */
  readonly angle: number;
  readonly phase: 'resting' | 'rising' | 'held' | 'falling';
  /** While rising or held: which end (1 the +x end, -1 the -x end) and which place there. */
  readonly end: 1 | -1;
  readonly slot: number;
}

export interface CoilTrayState {
  readonly current: number;
  readonly clips: readonly TrayClip[];
  readonly closedOnce: boolean;
  /** Whether clips have hung from the coil with the core in, and dropped again since. */
  readonly heldWithCore: boolean;
  readonly droppedAfterCore: boolean;
}

export type CoilTraySnapshot = SimSnapshot<CoilTrayState, CoilTrayControls>;

/** The coil as a magnet: with the core, its field multiplied by the core's gain. */
function winding(current: number, core: boolean) {
  return electromagnetWinding(COIL, current, core ? SOFT_IRON_CORE : null);
}

function sources(current: number, core: boolean): FieldSources {
  return current === 0 ? NO_SOURCES : { ...NO_SOURCES, windings: [winding(current, core)] };
}

/**
 * Where a clip clings: lying across an end face of the core, the first against it and each next
 * one against the last, in a bunch.
 */
export function slotPosition(end: 1 | -1, slot: number): Vec3 {
  const out = COIL.length / 2 + CLIP.thickness * (0.8 + 1.15 * slot);
  const down = [0.002, 0.0035, 0.0012, 0.003, 0.0045, 0.0022, 0.004, 0.0028][slot] ?? 0.003;
  const across = [0, 0.002, -0.0015, 0.001, -0.0025, 0.0028, -0.0008, 0.0015][slot] ?? 0;
  return vec3(end * out, AXIS_Y - down, across);
}

/** A fixed scatter, so the tray always starts the same way (the model stays pure). */
function scatter(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const START_CLIPS: readonly TrayClip[] = (() => {
  const random = scatter(7);
  return Array.from({ length: CLIP_COUNT }, () => ({
    position: vec3(
      (random() * 2 - 1) * (TRAY.halfWidth - 0.012),
      TRAY.floor + CLIP.thickness / 2,
      (random() * 2 - 1) * (TRAY.halfDepth - 0.008),
    ),
    speed: 0,
    angle: random() * Math.PI,
    phase: 'resting' as const,
    end: 1 as const,
    slot: 0,
  }));
})();

/** The pull on a clip at a point (N). */
function pullAt(point: Vec3, field: FieldSources): Vec3 {
  const source = field.windings[0];
  if (source === undefined) return ZERO;
  return softIronForce(CLIP_BODY, (at) => windingField(source, at), point);
}

function stepClips(clips: readonly TrayClip[], field: FieldSources, dt: number): TrayClip[] {
  const taken = new Set(
    clips
      .filter((clip) => clip.phase === 'rising' || clip.phase === 'held')
      .map((clip) => `${clip.end}:${clip.slot}`),
  );
  return clips.map((clip) => {
    switch (clip.phase) {
      case 'resting': {
        if (field.windings.length === 0) return clip;
        if (pullAt(clip.position, field).y <= WEIGHT) return clip;
        // It jumps to the nearer end, to the first free place there.
        const end: 1 | -1 = clip.position.x >= 0 ? 1 : -1;
        const slot = Array.from({ length: SLOTS_PER_END }, (_, index) => index).find(
          (index) => !taken.has(`${end}:${index}`),
        );
        if (slot === undefined) return clip;
        taken.add(`${end}:${slot}`);
        // It turns to lie across the end face as it jumps.
        return { ...clip, phase: 'rising', end, slot, speed: 0, angle: 0 };
      }
      case 'rising': {
        // Straight up to its place, drawn by the pull (the iron's surface takes any sideways part)
        // less its weight.
        let { position, speed } = clip;
        const target = slotPosition(clip.end, clip.slot);
        const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
        for (let step = 0; step < steps; step++) {
          const to = vec3(target.x - position.x, target.y - position.y, target.z - position.z);
          const distance = Math.hypot(to.x, to.y, to.z);
          if (distance < 1e-4) return { ...clip, position: target, speed: 0, phase: 'held' };
          const way = vec3(to.x / distance, to.y / distance, to.z / distance);
          const pull = pullAt(position, field);
          const along = Math.hypot(pull.x, pull.y, pull.z) - WEIGHT * way.y;
          if (along <= 0 && speed <= 0) {
            // The pull has gone (the switch opened): it falls back.
            return { ...clip, phase: 'falling', speed: 0 };
          }
          speed = Math.max(0, speed + (along / CLIP_MASS) * (dt / steps));
          const move = Math.min(distance, speed * (dt / steps));
          position = vec3(
            position.x + way.x * move,
            position.y + way.y * move,
            position.z + way.z * move,
          );
        }
        return { ...clip, position, speed };
      }
      case 'held': {
        // Pressed against the iron, it stays while the pull is more than its weight.
        const pull = pullAt(clip.position, field);
        if (Math.hypot(pull.x, pull.y, pull.z) > WEIGHT) return clip;
        return { ...clip, phase: 'falling', speed: 0 };
      }
      case 'falling': {
        // Straight down under gravity, back onto the tray floor.
        const speed = clip.speed + GRAVITY * dt;
        const floor = TRAY.floor + CLIP.thickness / 2;
        const y = clip.position.y - speed * dt;
        if (y > floor)
          return { ...clip, position: vec3(clip.position.x, y, clip.position.z), speed };
        const x = Math.min(
          TRAY.halfWidth - 0.012,
          Math.max(-TRAY.halfWidth + 0.012, clip.position.x),
        );
        const z = Math.min(
          TRAY.halfDepth - 0.006,
          Math.max(-TRAY.halfDepth + 0.006, clip.position.z),
        );
        return { ...clip, position: vec3(x, floor, z), speed: 0, phase: 'resting' };
      }
    }
  });
}

const WIRE_Y = BOARD.top + 0.0016;
const BATTERY_HALF = (BATTERY.cellLength * BATTERY.cells) / 2;
const PLUS_END = vec3(BATTERY.x + BATTERY_HALF + 0.004, WIRE_Y, BATTERY.z);
const MINUS_END = vec3(BATTERY.x - BATTERY_HALF - 0.004, WIRE_Y, BATTERY.z);
const HINGE = vec3(SWITCH.x - SWITCH.span / 2, WIRE_Y, SWITCH.z);
const CONTACT = vec3(SWITCH.x + SWITCH.span / 2, WIRE_Y, SWITCH.z);
/** The coil's leads leave its ends at the back and come down behind the tray. */
const LEAD_Z = -0.05;
const OUTER = COIL.radius + WINDING_DEPTH / 2;
const RIGHT_LEAD = vec3(COIL.length / 2, AXIS_Y, -OUTER);
const LEFT_LEAD = vec3(-COIL.length / 2, AXIS_Y, -OUTER);
/** The winding as drawn: fewer, thicker turns than the real two hundred. */
const DRAWN_TURNS = 30;

/** The winding's path from its right end to its left: north at the right end. */
export const WINDING: Vec3[] = windingPath(COIL.center, OUTER, COIL.length, DRAWN_TURNS);

export const WIRES = {
  toSwitch: roundedPath(
    [PLUS_END, vec3(0.075, WIRE_Y, BATTERY.z), vec3(0.075, WIRE_Y, SWITCH.z), HINGE],
    0.012,
  ),
  toCoil: roundedPath(
    [
      CONTACT,
      vec3(0.165, WIRE_Y, SWITCH.z),
      vec3(0.165, WIRE_Y, LEAD_Z),
      vec3(RIGHT_LEAD.x, WIRE_Y, LEAD_Z),
      vec3(RIGHT_LEAD.x, AXIS_Y, LEAD_Z),
      RIGHT_LEAD,
    ],
    0.01,
  ),
  back: roundedPath(
    [
      LEFT_LEAD,
      vec3(LEFT_LEAD.x, AXIS_Y, LEAD_Z),
      vec3(LEFT_LEAD.x, WIRE_Y, LEAD_Z),
      vec3(MINUS_END.x - 0.014, WIRE_Y, LEAD_Z),
      vec3(MINUS_END.x - 0.014, WIRE_Y, BATTERY.z),
      MINUS_END,
    ],
    0.01,
  ),
} as const;

const LOOP = joinPaths(
  WIRES.toSwitch,
  [vec3(HINGE.x, BOARD.top + 0.016, SWITCH.z), vec3(CONTACT.x, BOARD.top + 0.016, SWITCH.z)],
  WIRES.toCoil,
  WINDING,
  WIRES.back,
  [vec3(MINUS_END.x, BOARD.top + BATTERY.cellRadius, BATTERY.z), PLUS_END],
);

export const coilTray: ModelDefinition<CoilTrayState, CoilTrayControls> = {
  id: 'coil-tray',
  title:
    'A coil of wire held above a tray of paper clips, with an iron core, a battery and a switch',
  controls: {
    switch: {
      kind: 'switch',
      label: 'Switch',
      onLabel: 'Closed',
      offLabel: 'Open',
      default: false,
    },
    core: { kind: 'switch', label: 'Iron core', onLabel: 'In', offLabel: 'Out', default: false },
  },
  flowSpeed: 0.02,

  createState() {
    return {
      current: 0,
      clips: START_CLIPS,
      closedOnce: false,
      heldWithCore: false,
      droppedAfterCore: false,
    };
  },

  step({ state, controls }, dt) {
    // The coil's time constant is under a millisecond: the current switches at once.
    const current = controls.switch ? CLOSED_CURRENT : 0;
    const clips = stepClips(state.clips, sources(current, controls.core), dt);
    const hanging = clips.some((clip) => clip.phase === 'held');
    const heldWithCore = state.heldWithCore || (hanging && controls.core);
    const allDown = clips.every((clip) => clip.phase === 'resting');
    return {
      current,
      clips,
      closedOnce: state.closedOnce || current > 0,
      heldWithCore,
      droppedAfterCore: state.droppedAfterCore || (heldWithCore && current === 0 && allDown),
    };
  },

  readings: {},

  fieldSources({ state, controls }) {
    return sources(state.current, controls.core);
  },

  // Field overlays draw in the level through the coil's axis.
  overlayRegion: { center: vec3(0, AXIS_Y, 0), halfWidth: 0.12, halfDepth: 0.08 },

  currentPaths({ state }): CurrentPath[] {
    return [{ points: LOOP, current: state.current }];
  },

  anchors: {
    coil: () => vec3(0, AXIS_Y + 0.03, 0),
    clips: () => vec3(-0.04, TRAY.floor + 0.012, 0.025),
    core: ({ controls }) =>
      controls.core
        ? vec3(CORE.length / 2, AXIS_Y + 0.012, 0)
        : vec3(0, BOARD.top + 0.02, CORE_OUT_Z),
    battery: () => vec3(BATTERY.x, BOARD.top + 0.03, BATTERY.z),
    switch: () => vec3(SWITCH.x, BOARD.top + 0.04, SWITCH.z),
  },
};

/** How many clips hang from the coil. */
export function clipsHeld(state: CoilTrayState): number {
  return state.clips.filter((clip) => clip.phase === 'held').length;
}
