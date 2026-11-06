import { Edges } from '@react-three/drei';
import { useContext, type ReactNode } from 'react';
import { DataTexture, NearestFilter, RedFormat } from 'three';
import { FAMILY_COLORS, POLE_COLORS } from '../colors';
import { PickedPart } from './pickedPart';

// The technical illustration style (spec, Teaching principle 3): flat colours in three tones of
// shading, with dark outlines on hard edges. Scenes name a kind of surface ("wood", "magnetNorth")
// and never a colour, so every model draws from one palette, and a part's colour says what it is
// for (spec, Visual design).

/** Letters and marks printed on parts. */
export const INK = '#2f3640';

/** A plain white card face, such as a meter's. */
export const CARD = '#ffffff';

const COLORS = {
  // Magnetism
  magnetNorth: POLE_COLORS.north,
  magnetSouth: POLE_COLORS.south,
  /** Darker than the family's colour, so field lines don't run into it. */
  compassCase: '#4f2fa0',

  // Electricity
  electric: FAMILY_COLORS.electricity,
  electricDark: '#06728a',
  /** A coated wire, dark enough that the current-flow dots show on it. */
  wire: '#06728a',
  /** The wire back to the battery. */
  wireReturn: '#0b4c5c',

  // Motion and mechanics
  motion: FAMILY_COLORS.motion,
  motionLight: '#f3983a',
  motionDark: '#b95f0c',

  // The neutral: what holds everything else up
  structure: FAMILY_COLORS.structure,
  towerPaint: '#dfe4e8',
  coverPaint: FAMILY_COLORS.structure,
  /** A painted cover drawn so the parts inside it show. */
  seeThroughPaint: '#e6ecf0',
  castIron: '#4d5862',
  rubber: '#363c44',
  ink: INK,
  card: CARD,

  // Materials the lessons name, which look like what they are
  wood: '#d9a86c',
  woodBoard: '#dfb37b',
  copper: '#cf8150',
  steel: '#5f6a75',
  iron: '#4a4d52',
  metal: '#c9cdd2',
  brass: '#cfae5a',
  glass: '#cfe6ee',

  // The land around the turbine
  houseWall: '#f6f7f5',
  houseRoof: '#4f5a64',
  houseDark: '#39424b',
  tree: '#4e8a4e',
  trunk: '#6b5238',
} as const;

export type SurfaceKind = keyof typeof COLORS;

/** See-through surfaces, and how much of what lies behind them they hide. */
const OPACITY: Partial<Record<SurfaceKind, number>> = {
  glass: 0.35,
  seeThroughPaint: 0.1,
};

/** The warm light of a glowing bulb filament. */
export const GLOW = '#ffd34d';

/** The outline colour. */
export const ILLUSTRATION_LINE = '#2a2c2f';

/** The flat-shaded material for one kind of surface. */
export function SurfaceMaterial({ kind }: { kind: SurfaceKind }) {
  const opacity = OPACITY[kind];
  // A part's kind can change on screen, and a material compiled as solid stays solid: three.js
  // doesn't recompile it when `transparent` changes. So solid and see-through never share one.
  return (
    <meshToonMaterial
      key={opacity === undefined ? 'solid' : 'see-through'}
      color={COLORS[kind]}
      gradientMap={toonSteps()}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
      depthWrite={opacity === undefined}
    />
  );
}

type Vec3 = readonly [number, number, number];

interface BlockProps {
  readonly kind: SurfaceKind;
  /** Width, height and depth (metres). */
  readonly size: Vec3;
  readonly position?: Vec3;
}

/** A box-shaped part, outlined. */
export function Block({ kind, size, position }: BlockProps) {
  return (
    <mesh position={position}>
      <boxGeometry args={[...size]} />
      <SurfaceMaterial kind={kind} />
      <Outline />
    </mesh>
  );
}

interface CylinderProps {
  readonly kind: SurfaceKind;
  readonly radius: number;
  /** Length along the cylinder's axis (metres). */
  readonly length: number;
  readonly position?: Vec3;
  readonly rotation?: Vec3;
  readonly children?: ReactNode;
}

/** A round part such as a wheel or a bumper, outlined at its rims. */
export function Cylinder({ kind, radius, length, position, rotation, children }: CylinderProps) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 32]} />
      <SurfaceMaterial kind={kind} />
      <Outline />
      {children}
    </mesh>
  );
}

/**
 * Dark lines on a part's hard edges. The threshold skips the shallow angles between a
 * cylinder's side faces, so a wheel shows its rims, not its facets. A picked part's lines are
 * heavier, and it keeps its colour.
 */
export function Outline() {
  const picked = useContext(PickedPart);
  return <Edges threshold={40} color={ILLUSTRATION_LINE} lineWidth={picked ? 3.4 : 1.6} />;
}

let steps: DataTexture | undefined;

/** Three tones of flat shading: shadow, side and lit. */
function toonSteps(): DataTexture {
  if (steps === undefined) {
    steps = new DataTexture(new Uint8Array([128, 186, 255]), 3, 1, RedFormat);
    steps.minFilter = NearestFilter;
    steps.magFilter = NearestFilter;
    steps.needsUpdate = true;
  }
  return steps;
}
