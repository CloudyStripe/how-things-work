import { LARGE_TURBINE_ROTOR, stepRotor, vec3, type RotorState } from '@/physics';
import type { ModelDefinition, SimSnapshot } from '../types';

// A stand-in wind turbine for the explorer, built from plain blocks. Phase 7 replaces it with
// the realistic turbine. The rotor turns by the physics core's rotor model; the rotor faces
// south (+z) into the wind, at real size.

/** Height of the rotor's axis above the ground (m). */
export const HUB_HEIGHT = 80;
/** A fresh, steady breeze (m/s) when the wind is on. */
const WIND_SPEED = 10;

export type TurbineControls = {
  readonly wind: boolean;
};

export type TurbineState = RotorState;
export type TurbineSnapshot = SimSnapshot<TurbineState, TurbineControls>;

export const windTurbineStandin: ModelDefinition<TurbineState, TurbineControls> = {
  id: 'wind-turbine-standin',
  title: 'A wind turbine on its tower (a stand-in made of plain blocks)',
  controls: {
    wind: { kind: 'switch', label: 'Wind', onLabel: 'Blowing', offLabel: 'Calm', default: false },
  },

  createState() {
    return { angle: 0, angularSpeed: 0 };
  },

  step({ state, controls }, dt) {
    return stepRotor(state, controls.wind ? WIND_SPEED : 0, dt, LARGE_TURBINE_ROTOR);
  },

  readings: {},

  fieldSources() {
    return { wires: [], earth: false };
  },

  overlayRegion: { center: vec3(0, HUB_HEIGHT, 0), halfWidth: 10 },

  anchors: {
    blades: () => vec3(0, HUB_HEIGHT + LARGE_TURBINE_ROTOR.radius * 0.75, 4),
    nacelle: () => vec3(0, HUB_HEIGHT + 4, -6),
    tower: () => vec3(0, HUB_HEIGHT * 0.45, 3),
  },

  // Removable parts in the order they come off, outside in. The tower stays.
  parts: [
    { id: 'blades', removable: true },
    { id: 'hub', removable: true },
    { id: 'nacelleCover', removable: true },
    { id: 'mainShaft', removable: true },
    { id: 'gearbox', removable: true },
    { id: 'generator', removable: true },
    { id: 'tower', removable: false },
  ],
};

/** The rotor is turning at a good part of its speed in the wind. */
export function rotorTurning(state: TurbineState): boolean {
  return state.angularSpeed > 0.5;
}
