import type { Texture } from 'three';
import { useLetterTexture } from './labelTexture';
import { Block } from './surfaces';

interface BarMagnetProps {
  /** Length (m) from end to end. */
  readonly length: number;
  /** The width and height of its square cross-section (m). */
  readonly side: number;
  /** False: N (red) to the right, along +x. True: N to the left. */
  readonly reversed: boolean;
}

/**
 * A painted bar magnet lying along x, centred on its group: N half red, S half blue, with the
 * letters printed on top.
 */
export function BarMagnet({ length, side, reversed }: BarMagnetProps) {
  const north = useLetterTexture('N', null, '#ffffff');
  const south = useLetterTexture('S', null, '#ffffff');
  const half = length / 2;
  const northX = reversed ? -half / 2 : half / 2;

  return (
    <group>
      {[
        { x: northX, kind: 'magnetNorth' as const, letter: north },
        { x: -northX, kind: 'magnetSouth' as const, letter: south },
      ].map(({ x, kind, letter }) => (
        <group key={kind} position={[x, 0, 0]}>
          <Block kind={kind} size={[half, side, side]} />
          <Letter texture={letter} side={side} />
        </group>
      ))}
    </group>
  );
}

/** A letter printed on a part's top face. */
export function Letter({
  texture,
  side,
  height,
}: {
  texture: Texture;
  side: number;
  height?: number;
}) {
  return (
    <mesh position={[0, height ?? side / 2 + 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[side * 0.8, side * 0.8]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}
