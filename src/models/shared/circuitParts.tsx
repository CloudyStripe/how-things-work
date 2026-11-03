import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, CurvePath, LineCurve3, Vector3, type Group, type MeshBasicMaterial } from 'three';
import type { Vec3 } from '@/physics';
import { Letter } from './BarMagnet';
import { useLetterTexture } from './labelTexture';
import { Block, Cylinder, GLOW, SurfaceMaterial, type SurfaceKind } from './surfaces';

// The parts every circuit bench shares: wires along a route, a battery, a knife switch and a
// bulb. Each draws centred on its group unless it says otherwise; anything that changes (the
// switch's blade, the bulb's glow) is read from the simulation every frame.

const INK = '#3a3c40';
/** Copper wire 1.5 mm across inside its plastic coating, 3.2 mm across. */
export const WIRE_RADIUS = 0.0016;

/** A coated wire along a route of points (world space, m), bending wherever the route does. */
export function Wire({ points, kind }: { points: readonly Vec3[]; kind: SurfaceKind }) {
  const path = useMemo(() => {
    const curve = new CurvePath<Vector3>();
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (a === undefined || b === undefined) continue;
      curve.add(new LineCurve3(new Vector3(a.x, a.y, a.z), new Vector3(b.x, b.y, b.z)));
    }
    return curve;
  }, [points]);
  // Twelve sides round the wire: smooth enough that no outline runs along it.
  return (
    <mesh>
      <tubeGeometry args={[path, points.length * 2, WIRE_RADIUS, 12, false]} />
      <SurfaceMaterial kind={kind} />
    </mesh>
  );
}

interface BatteryProps {
  /** Length and radius of one cell (m). */
  readonly length: number;
  readonly radius: number;
  /** How many cells lie end to end along x, positive end to the right. */
  readonly cells: number;
}

/** Cells lying end to end along x in a wooden holder, + at the right end and − at the left. */
export function Battery({ length, radius, cells }: BatteryProps) {
  const plus = useLetterTexture('+', null, INK);
  const minus = useLetterTexture('−', null, INK);
  const total = length * cells;
  return (
    <group>
      <Block
        kind="holder"
        size={[total + 0.01, radius * 0.9, radius * 2.4]}
        position={[0, radius * 0.45, 0]}
      />
      {Array.from({ length: cells }, (_, cell) => {
        const x = -total / 2 + length * (cell + 0.5);
        return (
          <group key={cell} position={[x, radius, 0]}>
            <Cylinder
              kind="battery"
              radius={radius}
              length={length * 0.94}
              rotation={[0, 0, Math.PI / 2]}
            />
            {/* The positive end's raised button. */}
            <Cylinder
              kind="brass"
              radius={radius * 0.35}
              length={length * 0.06}
              position={[length * 0.47, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
            />
          </group>
        );
      })}
      <group position={[total / 2 - length * 0.18, 0, 0]}>
        <Letter texture={plus} side={radius * 1.4} height={radius * 2 + 0.0004} />
      </group>
      <group position={[-total / 2 + length * 0.18, 0, 0]}>
        <Letter texture={minus} side={radius * 1.4} height={radius * 2 + 0.0004} />
      </group>
    </group>
  );
}

/** How far a knife switch's blade opens (rad). */
const OPEN_ANGLE = 1;

interface KnifeSwitchProps {
  /** From its hinge post to its contact post along x (m). */
  readonly span: number;
  readonly isClosed: () => boolean;
  readonly interactive: boolean;
  onToggle(): void;
}

/**
 * A knife switch: a metal blade hinged on one brass post that drops into a clip on the other.
 * Closed, the blade joins the posts; open, it stands up off the clip. Clicking it flips it.
 */
export function KnifeSwitch({ span, isClosed, interactive, onToggle }: KnifeSwitchProps) {
  const blade = useRef<Group>(null);
  const postHeight = 0.012;

  useFrame(() => {
    if (blade.current) blade.current.rotation.z = isClosed() ? 0 : OPEN_ANGLE;
  });

  const handlers = {
    onClick(event: ThreeEvent<MouseEvent>) {
      if (!interactive) return;
      event.stopPropagation();
      onToggle();
    },
    onPointerOver() {
      if (interactive) document.body.style.cursor = 'pointer';
    },
    onPointerOut() {
      document.body.style.cursor = '';
    },
  };

  return (
    <group {...handlers}>
      <Block kind="holder" size={[span + 0.03, 0.006, 0.026]} position={[0, 0.003, 0]} />
      {[-1, 1].map((side) => (
        <Block
          key={side}
          kind="brass"
          size={[0.005, postHeight, 0.01]}
          position={[(side * span) / 2, 0.006 + postHeight / 2, 0]}
        />
      ))}
      {/* The blade pivots on the left post. */}
      <group ref={blade} position={[-span / 2, 0.006 + postHeight - 0.002, 0]}>
        <Block kind="metal" size={[span + 0.004, 0.0025, 0.006]} position={[span / 2, 0, 0]} />
        <Cylinder
          kind="ink"
          radius={0.004}
          length={0.014}
          position={[span + 0.006, 0.006, 0]}
          rotation={[0, 0, 0]}
        />
      </group>
    </group>
  );
}

/** A torch bulb in a holder, glowing from 0 (dark) to 1 (full brightness) as `getGlow` says. */
export function Bulb({ getGlow }: { getGlow: () => number }) {
  const fill = useRef<MeshBasicMaterial>(null);
  const halo = useRef<MeshBasicMaterial>(null);
  const colors = useMemo(() => ({ dark: new Color('#e9eef0'), lit: new Color(GLOW) }), []);
  const glassRadius = 0.012;
  const glassY = 0.03;

  useFrame(() => {
    const glow = Math.min(1, Math.max(0, getGlow()));
    if (fill.current) {
      fill.current.color.copy(colors.dark).lerp(colors.lit, glow);
      fill.current.opacity = 0.35 + 0.6 * glow;
    }
    if (halo.current) halo.current.opacity = 0.35 * glow;
  });

  return (
    <group>
      <Block kind="holder" size={[0.03, 0.008, 0.03]} position={[0, 0.004, 0]} />
      <Cylinder kind="brass" radius={0.007} length={0.012} position={[0, 0.014, 0]} />
      {/* The filament between its two supports. */}
      <Block kind="ink" size={[0.006, 0.0008, 0.0008]} position={[0, glassY, 0]} />
      <mesh position={[0, glassY, 0]}>
        <sphereGeometry args={[glassRadius, 32, 24]} />
        <meshBasicMaterial ref={fill} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, glassY, 0]}>
        <sphereGeometry args={[glassRadius * 2, 32, 24]} />
        <meshBasicMaterial ref={halo} color={GLOW} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
