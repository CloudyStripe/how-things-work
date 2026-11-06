import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { Letter } from './BarMagnet';
import { useLetterTexture } from './labelTexture';
import { Block, Cylinder, INK } from './surfaces';

// A compass: a housing in the magnetism colour, a card face and a needle that is a small magnet
// (red north, blue south), drawn centred on its group with the needle at `needleHeight`. The
// needle's angle is a compass bearing read from the simulation every frame.

interface CompassProps {
  readonly radius: number;
  /** Height of the needle above the bottom of the housing (m). */
  readonly needleHeight: number;
  readonly getAngle: () => number;
  /** N, E, S and W round the face: worth it on a large compass, lost on a small one. */
  readonly letters?: boolean;
}

export function Compass({ radius, needleHeight, getAngle, letters = false }: CompassProps) {
  const needle = useRef<Group>(null);
  const housing = needleHeight * 0.9;
  const length = radius * 1.6;

  useFrame(() => {
    // A bearing turns clockwise seen from above; three.js turns anticlockwise about +y.
    if (needle.current) needle.current.rotation.y = -getAngle();
  });

  return (
    <group>
      <Cylinder
        kind="compassCase"
        radius={radius}
        length={housing}
        position={[0, housing / 2, 0]}
      />
      <Cylinder kind="card" radius={radius * 0.88} length={0.0008} position={[0, housing, 0]} />
      {letters && <FaceLetters radius={radius} height={housing + 0.0006} />}
      <group ref={needle} position={[0, needleHeight, 0]}>
        {/* Bearing 0 points north, along -z: the red half leads. */}
        <Block
          kind="magnetNorth"
          size={[radius * 0.13, radius * 0.035, length / 2]}
          position={[0, 0, -length / 4]}
        />
        <Block
          kind="magnetSouth"
          size={[radius * 0.13, radius * 0.035, length / 2]}
          position={[0, 0, length / 4]}
        />
        <Cylinder kind="brass" radius={radius * 0.08} length={radius * 0.07} />
      </group>
    </group>
  );
}

/** N, E, S and W printed round the face; the housing never turns, so N faces north. */
function FaceLetters({ radius, height }: { radius: number; height: number }) {
  const textures = {
    N: useLetterTexture('N', null, INK),
    E: useLetterTexture('E', null, INK),
    S: useLetterTexture('S', null, INK),
    W: useLetterTexture('W', null, INK),
  };
  const reach = radius * 0.7;
  const places = [
    { texture: textures.N, x: 0, z: -reach },
    { texture: textures.E, x: reach, z: 0 },
    { texture: textures.S, x: 0, z: reach },
    { texture: textures.W, x: -reach, z: 0 },
  ];
  return (
    <>
      {places.map(({ texture, x, z }) => (
        <group key={texture.uuid} position={[x, 0, z]}>
          <Letter texture={texture} side={radius * 0.3} height={height} />
        </group>
      ))}
    </>
  );
}
