import {
  add,
  compassBearing,
  earthField,
  length,
  stepCompassNeedle,
  straightWireField,
  UP,
  vec3,
  ZERO,
  type NeedleState,
  type StraightWire,
  type Vec3,
} from '@/physics';
import type { ModelDefinition, SimSnapshot } from '../types';

// Phase 3 placeholder: a vertical wire through a board, with one compass beside it. Plain grey
// shapes on the real physics core, so the engine is exercised end to end before Experiment 1
// replaces this model in Phase 4.

/** Source current (A) at each level. Each level doubles the one before. */
export const CURRENT_LEVELS = { low: 1, medium: 2, high: 4 } as const;
export type CurrentLevel = keyof typeof CURRENT_LEVELS;

/** The compass sits on the board 2 cm north of the wire. */
export const COMPASS_POSITION = vec3(0, 0, -0.02);
const WIRE_RADIUS = 0.75e-3;

export type PlaceholderControls = {
  readonly switchClosed: boolean;
  readonly level: CurrentLevel;
  readonly reversed: boolean;
};

export interface PlaceholderState {
  readonly needle: NeedleState;
  /** Net field at the compass: the wire's plus Earth's (T). */
  readonly field: Vec3;
  /** Bearing the needle settles at in that field (rad, clockwise from north). */
  readonly fieldBearing: number | null;
  /** Current up the wire (A); negative when reversed. */
  readonly current: number;
}

export type PlaceholderSnapshot = SimSnapshot<PlaceholderState, PlaceholderControls>;

export function wireCurrent(controls: PlaceholderControls): number {
  if (!controls.switchClosed) return 0;
  const amps = CURRENT_LEVELS[controls.level];
  return controls.reversed ? -amps : amps;
}

function wire(current: number): StraightWire {
  return { point: ZERO, direction: UP, radius: WIRE_RADIUS, current };
}

function wireFieldAtCompass(current: number): Vec3 {
  return straightWireField(wire(current), COMPASS_POSITION);
}

function settle(current: number, needle: NeedleState): PlaceholderState {
  const field = add(wireFieldAtCompass(current), earthField());
  return { needle, field, fieldBearing: compassBearing(field), current };
}

const SETTLED_ANGLE = (3 * Math.PI) / 180;
const SETTLED_SPEED = 0.2;

/**
 * Whether the compass has come to rest pointing between two bearings (degrees clockwise from
 * north). Judged on the direction the field holds the needle at, and only once the needle has
 * settled there, so an overshoot swinging through the range does not count.
 */
export function compassSettledBetween(
  state: PlaceholderState,
  fromDegrees: number,
  toDegrees: number,
): boolean {
  if (state.fieldBearing === null) return false;
  const bearing = (state.fieldBearing * 180) / Math.PI;
  if (bearing <= fromDegrees || bearing >= toDegrees) return false;
  const offset = Math.atan2(
    Math.sin(state.needle.angle - state.fieldBearing),
    Math.cos(state.needle.angle - state.fieldBearing),
  );
  return Math.abs(offset) < SETTLED_ANGLE && Math.abs(state.needle.angularVelocity) < SETTLED_SPEED;
}

const LEVEL_LABELS: Record<CurrentLevel, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export const placeholderWireCompass: ModelDefinition<PlaceholderState, PlaceholderControls> = {
  id: 'placeholder-wire-compass',
  title: 'A wire through a board with a compass beside it',
  controls: {
    switchClosed: {
      kind: 'switch',
      label: 'Switch',
      onLabel: 'Closed',
      offLabel: 'Open',
      default: false,
    },
    level: {
      kind: 'choice',
      label: 'Current level',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
      default: 'low',
    },
    reversed: {
      kind: 'switch',
      label: 'Current direction',
      onLabel: 'Reversed',
      offLabel: 'Normal',
      default: false,
    },
  },

  createState(controls) {
    const state = settle(wireCurrent(controls), { angle: 0, angularVelocity: 0 });
    return { ...state, needle: { angle: state.fieldBearing ?? 0, angularVelocity: 0 } };
  },

  step({ state, controls }, dt) {
    const next = settle(wireCurrent(controls), state.needle);
    return { ...next, needle: stepCompassNeedle(state.needle, next.field, dt) };
  },

  readings: {
    current: {
      label: 'Current',
      unit: 'A',
      scale: 1,
      digits: 1,
      read: ({ state }) => Math.abs(state.current),
      describe: ({ controls }) => (controls.switchClosed ? LEVEL_LABELS[controls.level] : 'Off'),
    },
    wireField: {
      label: "Wire's field at the compass",
      unit: 'µT',
      scale: 1e6,
      digits: 1,
      read: ({ state }) => length(wireFieldAtCompass(state.current)),
    },
  },

  fieldSources: ({ state }) => ({ wires: [wire(state.current)], earth: true }),

  overlayRegion: { center: ZERO, halfWidth: 0.06 },
};
