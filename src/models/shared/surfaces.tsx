import { Edges } from '@react-three/drei';
import type { ReactNode } from 'react';
import { DataTexture, NearestFilter, RedFormat } from 'three';

// The technical illustration style (spec, Teaching principle 3): flat colours in three tones of
// shading, with dark outlines on hard edges. Scenes name a kind of surface ("rail",
// "magnetNorth") and never a colour, so every model draws from one palette.

export type SurfaceKind =
  | 'tabletop'
  | 'rail'
  | 'holder'
  | 'cart'
  | 'endStop'
  | 'rubber'
  | 'metal'
  | 'magnetNorth'
  | 'magnetSouth'
  | 'peg'
  | 'copper'
  | 'steel'
  | 'iron'
  | 'glass'
  | 'brass'
  | 'card'
  | 'ink'
  | 'board'
  | 'battery'
  | 'wireRed'
  | 'wireBlack'
  | 'whitePaint'
  | 'seeThroughPaint'
  | 'castIron'
  | 'gearCase'
  | 'generatorCase'
  | 'grass'
  | 'selected';

const COLORS: Readonly<Record<SurfaceKind, string>> = {
  tabletop: '#e6dfd0',
  rail: '#d6bc93',
  holder: '#c49b6c',
  cart: '#eadac0',
  endStop: '#a8835b',
  rubber: '#3b3d40',
  metal: '#c9cdd2',
  magnetNorth: '#d9473a',
  magnetSouth: '#3a6ec0',
  peg: '#dcc095',
  copper: '#cf8150',
  steel: '#959ca5',
  iron: '#4a4d52',
  glass: '#cfe6ee',
  brass: '#cfae5a',
  card: '#f8f6ef',
  ink: '#3a3c40',
  board: '#dcc6a0',
  battery: '#4f7a62',
  wireRed: '#c9483f',
  wireBlack: '#35373b',
  whitePaint: '#eef1f3',
  /** A painted cover drawn so the parts inside it show. */
  seeThroughPaint: '#eef1f3',
  castIron: '#6b737b',
  gearCase: '#8197ad',
  generatorCase: '#6f8f78',
  grass: '#cbd8bf',
  /** A part the learner has picked out, in an explorer. */
  selected: '#f2c14e',
};

/** See-through surfaces, and how much of what lies behind them they hide. */
const OPACITY: Partial<Record<SurfaceKind, number>> = { glass: 0.35, seeThroughPaint: 0.2 };

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
 * cylinder's side faces, so a wheel shows its rims, not its facets.
 */
export function Outline() {
  return <Edges threshold={40} color={ILLUSTRATION_LINE} lineWidth={1.4} />;
}

let steps: DataTexture | undefined;

/** Three tones of flat shading: shadow, side and lit. */
function toonSteps(): DataTexture {
  if (steps === undefined) {
    steps = new DataTexture(new Uint8Array([153, 191, 255]), 3, 1, RedFormat);
    steps.minFilter = NearestFilter;
    steps.magFilter = NearestFilter;
    steps.needsUpdate = true;
  }
  return steps;
}
