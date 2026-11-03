import { Edges, RoundedBox } from '@react-three/drei';
import type { ReactNode } from 'react';
import { DataTexture, NearestFilter, RedFormat } from 'three';
import { useRenderStyle } from './renderStyle';
import { woodTexture, type WoodTone } from './woodTexture';

// What each kind of surface looks like in each candidate style. Scenes name a kind ("rail",
// "magnetNorth") and never a colour, so the style decision changes this file, not the scenes.
//
// Photorealistic: physically based materials, wood grain, rounded edges, soft shadows.
// Technical illustration: flat colours in three tones of shading, with dark outlines.

export type SurfaceKind =
  | 'tabletop'
  | 'rail'
  | 'holder'
  | 'cart'
  | 'endStop'
  | 'rubber'
  | 'metal'
  | 'magnetNorth'
  | 'magnetSouth';

interface PhotorealSurface {
  readonly color: string;
  readonly roughness: number;
  readonly metalness?: number;
  /** A varnish or paint layer over the base. */
  readonly clearcoat?: number;
  readonly wood?: WoodTone;
}

const PHOTOREAL: Readonly<Record<SurfaceKind, PhotorealSurface>> = {
  tabletop: { color: '#cfcbc3', roughness: 0.75 },
  rail: {
    color: '#ffffff',
    roughness: 0.45,
    clearcoat: 0.35,
    wood: { light: '#b8875a', dark: '#83552f' },
  },
  holder: { color: '#ffffff', roughness: 0.5, wood: { light: '#dcbb8f', dark: '#a87f52' } },
  cart: { color: '#ffffff', roughness: 0.5, wood: { light: '#e6cfa6', dark: '#b8935f' } },
  endStop: { color: '#ffffff', roughness: 0.5, wood: { light: '#8c603a', dark: '#583820' } },
  rubber: { color: '#1e1e1f', roughness: 0.85 },
  metal: { color: '#c4c8cd', roughness: 0.3, metalness: 1 },
  magnetNorth: { color: '#b3241c', roughness: 0.35, clearcoat: 0.8 },
  magnetSouth: { color: '#1d4e98', roughness: 0.35, clearcoat: 0.8 },
};

const ILLUSTRATION: Readonly<Record<SurfaceKind, string>> = {
  tabletop: '#e6dfd0',
  rail: '#d6bc93',
  holder: '#c49b6c',
  cart: '#eadac0',
  endStop: '#a8835b',
  rubber: '#3b3d40',
  metal: '#c9cdd2',
  magnetNorth: '#d9473a',
  magnetSouth: '#3a6ec0',
};

/** The outline colour in the illustration style. */
export const ILLUSTRATION_LINE = '#2a2c2f';

/** Wood grain repeats this often per metre on bench parts (their UVs are in metres). */
const WOOD_REPEAT_PER_METRE = 10;

/** The material for one kind of surface, in the current style. */
export function SurfaceMaterial({ kind, woodRepeat = WOOD_REPEAT_PER_METRE }: SurfaceProps) {
  const style = useRenderStyle((state) => state.style);
  if (style === 'illustration') {
    return <meshToonMaterial color={ILLUSTRATION[kind]} gradientMap={toonSteps()} />;
  }
  const surface = PHOTOREAL[kind];
  return (
    <meshPhysicalMaterial
      color={surface.color}
      roughness={surface.roughness}
      metalness={surface.metalness ?? 0}
      clearcoat={surface.clearcoat ?? 0}
      clearcoatRoughness={0.25}
      map={surface.wood === undefined ? null : woodTexture(surface.wood, woodRepeat)}
    />
  );
}

interface SurfaceProps {
  readonly kind: SurfaceKind;
  /** How often the wood grain repeats per UV unit, for parts whose UVs are not in metres. */
  readonly woodRepeat?: number;
}

type Vec3 = readonly [number, number, number];

interface BlockProps {
  readonly kind: SurfaceKind;
  /** Width, height and depth (metres). */
  readonly size: Vec3;
  readonly position?: Vec3;
  /** How rounded the edges are in the photorealistic style (metres). */
  readonly radius?: number;
}

/** A box-shaped part: rounded and shadowed when photorealistic, outlined when illustrated. */
export function Block({ kind, size, position, radius = 0.0015 }: BlockProps) {
  const style = useRenderStyle((state) => state.style);
  const [width, height, depth] = size;
  if (style === 'illustration') {
    return (
      <mesh position={position}>
        <boxGeometry args={[width, height, depth]} />
        <SurfaceMaterial kind={kind} />
        <Outline />
      </mesh>
    );
  }
  // A rounded box needs its radius under half its thinnest side.
  const safeRadius = Math.min(radius, Math.min(width, height, depth) / 2 - 1e-5);
  return (
    <RoundedBox
      args={[width, height, depth]}
      radius={safeRadius}
      smoothness={4}
      position={position}
      castShadow
      receiveShadow
    >
      <SurfaceMaterial kind={kind} />
    </RoundedBox>
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

/** A round part such as a wheel or a bumper. */
export function Cylinder({ kind, radius, length, position, rotation, children }: CylinderProps) {
  const style = useRenderStyle((state) => state.style);
  const photoreal = style === 'photoreal';
  return (
    <mesh position={position} rotation={rotation} castShadow={photoreal} receiveShadow={photoreal}>
      <cylinderGeometry args={[radius, radius, length, 32]} />
      <SurfaceMaterial kind={kind} />
      {!photoreal && <Outline />}
      {children}
    </mesh>
  );
}

/**
 * The illustration style's dark lines on a part's hard edges. The threshold skips the shallow
 * angles between a cylinder's side faces, so a wheel shows its rims, not its facets.
 */
function Outline() {
  return <Edges threshold={40} color={ILLUSTRATION_LINE} lineWidth={1.4} />;
}

let steps: DataTexture | undefined;

/** Three tones of flat shading for the illustration style: shadow, side and lit. */
function toonSteps(): DataTexture {
  if (steps === undefined) {
    steps = new DataTexture(new Uint8Array([153, 191, 255]), 3, 1, RedFormat);
    steps.minFilter = NearestFilter;
    steps.magFilter = NearestFilter;
    steps.needsUpdate = true;
  }
  return steps;
}
