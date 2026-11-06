import {
  dipoleFluxLinkage,
  LARGE_TURBINE_ROTOR,
  steadyRotorSpeed,
  NO_SOURCES,
  rotatingMagnetDipole,
  stepRotor,
  vec3,
  type Coil,
  type RotorState,
} from '@/physics';
import type { ExplorerView, GeneratorView, ModelDefinition, SimSnapshot } from '../types';

// The wind turbine for lessons 1 and 10: a three-blade turbine at real size, its rotor facing
// south (+z) into the wind. The rotor turns by the physics core's rotor model; the gearbox turns
// the generator a hundred times faster. The generator overlay shows its magnets passing its
// coils, with the current each coil makes (the same spinning-magnet physics as lesson 9).

/** Height of the rotor's axis above the ground (m). */
export const HUB_HEIGHT = 80;
/** A fresh, steady breeze (m/s) when the wind is on. */
const WIND_SPEED = 10;
/** The generator turns this many times for each turn of the blades. */
export const GEAR_RATIO = 100;

/** Where each part sits along the rotor's axis (z, m: positive toward the wind). */
export const LAYOUT = {
  tower: { baseRadius: 2.2, topRadius: 1.45 },
  nacelle: { front: 1.6, back: -9.4, width: 3.6, height: 3.8, bottom: HUB_HEIGHT - 1.9 },
  hub: { center: 2.6, radius: 1.7, length: 3.2 },
  blades: { root: 1.6, length: LARGE_TURBINE_ROTOR.radius, rootChord: 3.2, tipChord: 0.8 },
  mainShaft: { front: 1.4, back: -2.8, radius: 0.42 },
  gearbox: { front: -2.8, back: -5.4, radius: 1.25 },
  generator: { front: -6.2, back: -8.6, radius: 1.05 },
} as const;

/**
 * How far (m) and which way each part moves at the fully exploded view. The scene moves each part
 * by this times the explode slider, and the camera follows a part there.
 */
export const EXPLODE: Readonly<Record<string, readonly [number, number, number]>> = {
  blades: [0, 0, 18],
  hub: [0, 0, 11],
  nacelleCover: [0, 10, 0],
  mainShaft: [0, 0, 5],
  gearbox: [0, 4, 0],
  generator: [0, 0, -8],
  tower: [0, 0, 0],
};

/** The parts that sit inside the nacelle cover. */
const INSIDE_COVER = ['mainShaft', 'gearbox', 'generator'];
/** How far open (0 to 1) the exploded view has lifted the cover clear of the parts inside. */
const COVER_CLEAR = 0.6;

/** The cover is see-through while a part inside it is picked and it would still hide that part. */
export function coverSeeThrough(view: ExplorerView): boolean {
  return (
    view.selectedPart !== null &&
    INSIDE_COVER.includes(view.selectedPart) &&
    view.explode < COVER_CLEAR
  );
}

/** The generator overlay's model: four magnet poles on the generator's rotor, six coils round it. */
export const GENERATOR = {
  // On the fast shaft, which sits half a metre above the main shaft.
  center: vec3(0, HUB_HEIGHT + 0.5, (LAYOUT.generator.front + LAYOUT.generator.back) / 2),
  poles: 4,
  coils: 6,
  /** The magnets' radius from the shaft, and the coils' (m). */
  magnetRadius: 0.62,
  coilRadius: 0.92,
  /** Each pole's strength as a dipole (A·m²), and each coil's turns. */
  moment: 4000,
  turns: 40,
} as const;
/**
 * The overlay shows the generator turning this much slower than it does: at a hundred times the
 * blades' speed it would be a blur.
 */
export const GENERATOR_SLOW_MOTION = 40;

export type TurbineControls = {
  readonly wind: boolean;
};

export interface TurbineState extends RotorState {
  /** The generator's angle (rad), as the overlay shows it, slowed down. */
  readonly shownGeneratorAngle: number;
}

export type TurbineSnapshot = SimSnapshot<TurbineState, TurbineControls>;

/** One of the generator's coils, lying across the rotor's axis, facing the shaft. */
export function generatorCoil(index: number): Coil {
  const angle = (index / GENERATOR.coils) * 2 * Math.PI;
  const radial = vec3(Math.cos(angle), Math.sin(angle), 0);
  return {
    center: vec3(
      GENERATOR.center.x + radial.x * GENERATOR.coilRadius,
      GENERATOR.center.y + radial.y * GENERATOR.coilRadius,
      GENERATOR.center.z,
    ),
    axis: radial,
    radius: 0.16,
    length: 0.24,
    turns: GENERATOR.turns,
    wireDiameter: 0.003,
  };
}

/** Flux linkage through one coil from every pole on the generator's rotor at a shaft angle. */
export function generatorCoilLinkage(index: number, shaftAngle: number): number {
  const coil = generatorCoil(index);
  let linkage = 0;
  for (let pole = 0; pole < GENERATOR.poles; pole++) {
    const at = shaftAngle + (pole / GENERATOR.poles) * 2 * Math.PI;
    // Each pole is a magnet pointing out from the shaft, north and south in turn.
    const outward = pole % 2 === 0 ? 1 : -1;
    const position = vec3(
      GENERATOR.center.x + Math.cos(at) * GENERATOR.magnetRadius,
      GENERATOR.center.y + Math.sin(at) * GENERATOR.magnetRadius,
      GENERATOR.center.z,
    );
    const dipole = rotatingMagnetDipole(
      {
        position,
        shaftAxis: vec3(0, 0, 1),
        referenceDirection: vec3(Math.cos(at) * outward, Math.sin(at) * outward, 0),
        moment: GENERATOR.moment,
      },
      0,
    );
    linkage += dipoleFluxLinkage(coil, dipole);
  }
  return linkage;
}

/** How fast a coil's flux linkage changes with shaft angle, at most (Wb/rad). */
const PEAK_LINKAGE_RATE = (() => {
  let peak = 0;
  for (let step = 0; step < 360; step++) {
    const angle = (step / 360) * 2 * Math.PI;
    peak = Math.max(peak, Math.abs(linkageRate(0, angle)));
  }
  return peak;
})();

function linkageRate(coil: number, angle: number): number {
  const h = 1e-4;
  return (generatorCoilLinkage(coil, angle + h) - generatorCoilLinkage(coil, angle - h)) / (2 * h);
}

/** The rotor's speed (rad/s) in the lesson's breeze, once it has settled. */
const FULL_SPEED = steadyRotorSpeed(WIND_SPEED, LARGE_TURBINE_ROTOR);

export const windTurbine: ModelDefinition<TurbineState, TurbineControls> = {
  id: 'wind-turbine',
  title: 'A three-blade wind turbine on its tower',
  wholeViewLabel: 'Whole turbine',
  controls: {
    wind: { kind: 'switch', label: 'Wind', onLabel: 'Windy', offLabel: 'Calm', default: false },
  },

  createState() {
    return { angle: 0, angularSpeed: 0, shownGeneratorAngle: 0 };
  },

  step({ state, controls }, dt) {
    const rotor = stepRotor(state, controls.wind ? WIND_SPEED : 0, dt, LARGE_TURBINE_ROTOR);
    const turned = rotor.angle - state.angle;
    return {
      ...rotor,
      shownGeneratorAngle:
        (state.shownGeneratorAngle + (turned * GEAR_RATIO) / GENERATOR_SLOW_MOTION) % (2 * Math.PI),
    };
  },

  readings: {},

  fieldSources() {
    return NO_SOURCES;
  },

  overlayRegion: { center: vec3(0, HUB_HEIGHT, GENERATOR.center.z), halfWidth: 4 },

  generatorView({ state }): GeneratorView {
    const angle = state.shownGeneratorAngle;
    const { x, y, z } = GENERATOR.center;
    return {
      magnets: Array.from({ length: GENERATOR.poles }, (_, pole) => {
        const at = angle + (pole / GENERATOR.poles) * 2 * Math.PI;
        const outward = vec3(Math.cos(at), Math.sin(at), 0);
        return {
          position: vec3(
            x + outward.x * GENERATOR.magnetRadius,
            y + outward.y * GENERATOR.magnetRadius,
            z,
          ),
          outward,
          north: pole % 2 === 0,
        };
      }),
      // Faraday's law: each coil's emf is minus its flux linkage's rate of change, which is its
      // rate with shaft angle times the shaft's speed. Shown as a share of the most it makes in
      // the breeze.
      coils: Array.from({ length: GENERATOR.coils }, (_, index) => {
        const coil = generatorCoil(index);
        return {
          center: coil.center,
          axis: coil.axis,
          radius: coil.radius,
          current:
            (-linkageRate(index, angle) / PEAK_LINKAGE_RATE) * (state.angularSpeed / FULL_SPEED),
        };
      }),
    };
  },

  anchors: {
    blades: () => vec3(0, HUB_HEIGHT + LARGE_TURBINE_ROTOR.radius * 0.75, LAYOUT.hub.center),
    nacelle: () => vec3(0, HUB_HEIGHT + 2.6, -5),
    tower: () => vec3(0, HUB_HEIGHT * 0.45, 2.5),
  },

  // Removable parts in the order they come off, outside in. The tower stays.
  parts: [
    { id: 'blades', removable: true, family: 'motion' },
    { id: 'hub', removable: true, family: 'motion' },
    { id: 'nacelleCover', removable: true, family: 'structure' },
    { id: 'mainShaft', removable: true, family: 'motion' },
    { id: 'gearbox', removable: true, family: 'motion' },
    { id: 'generator', removable: true, family: 'electricity' },
    { id: 'tower', removable: false, family: 'structure' },
  ],
};

/** The rotor is turning at a good part of its speed in the wind. */
export function rotorTurning(state: TurbineState): boolean {
  return state.angularSpeed > 0.5;
}
