import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { BarMagnet, Letter } from '../shared/BarMagnet';
import { useLetterTexture } from '../shared/labelTexture';
import { Block, Cylinder, SurfaceMaterial } from '../shared/surfaces';
import { useBenchDrag } from '../shared/useBenchDrag';
import type { SceneProps } from '../types';
import {
  COMPASS,
  MAGNET,
  MAGNET_HEIGHT,
  MAGNET_X,
  NORTH_MARK,
  spotAt,
  type CompassBenchState,
} from './definition';

// The compass bench: a painted bar magnet, a brass compass with a card face and a red and blue
// needle (a small magnet: red north, blue south), and an arrow printed on the bench pointing
// north. The compass's place and the needle's angle come from the simulation each frame.

/** The bench top: wide enough that its edges stay out of the default view. */
const TABLETOP = { width: 2.4, depth: 1.6 };
const HOUSING_HEIGHT = 0.012;
const FACE_HEIGHT = HOUSING_HEIGHT + 0.0004;
const NEEDLE = { length: 0.064, width: 0.005, thickness: 0.0012 };
const INK = '#3a3c40';

export function CompassBenchScene({ getSnapshot, interactive, setControl }: SceneProps) {
  const compass = useRef<Group>(null);
  const needle = useRef<Group>(null);
  // The engine pairs this scene only with its own model, so the state is this model's.
  const state = () => getSnapshot().state as CompassBenchState;

  useFrame(() => {
    const current = state();
    compass.current?.position.set(current.compass.x, 0, current.compass.z);
    // The needle's angle is a bearing, clockwise from north seen from above.
    if (needle.current) needle.current.rotation.y = -current.needle.angle;
  });

  const drag = useBenchDrag({
    enabled: interactive,
    height: COMPASS.needleHeight,
    current: () => ({ x: state().compass.x, z: state().compass.z }),
    onDrag(x, z) {
      const spot = spotAt(x, z);
      setControl('compass', {
        across: Math.min(1, Math.max(0, spot.across)),
        depth: Math.min(1, Math.max(0, spot.depth)),
      });
    },
  });

  return (
    <group>
      <Block
        kind="tabletop"
        size={[TABLETOP.width, 0.02, TABLETOP.depth]}
        position={[0, -0.01, 0]}
      />
      <group position={[MAGNET_X, MAGNET_HEIGHT, 0]}>
        <BarMagnet length={MAGNET.length} side={MAGNET.side} reversed={false} />
      </group>
      <NorthMark />

      <group ref={compass} {...drag}>
        <Cylinder
          kind="brass"
          radius={COMPASS.radius}
          length={HOUSING_HEIGHT}
          position={[0, HOUSING_HEIGHT / 2, 0]}
        />
        <Cylinder
          kind="card"
          radius={COMPASS.radius * 0.88}
          length={0.0008}
          position={[0, HOUSING_HEIGHT, 0]}
        />
        <CompassLetters />
        <group ref={needle} position={[0, COMPASS.needleHeight, 0]}>
          {/* Bearing 0 points north, along -z: the red half leads. */}
          <Block
            kind="magnetNorth"
            size={[NEEDLE.width, NEEDLE.thickness, NEEDLE.length / 2]}
            position={[0, 0, -NEEDLE.length / 4]}
          />
          <Block
            kind="magnetSouth"
            size={[NEEDLE.width, NEEDLE.thickness, NEEDLE.length / 2]}
            position={[0, 0, NEEDLE.length / 4]}
          />
          <Cylinder kind="brass" radius={0.0028} length={0.0024} />
        </group>
      </group>
    </group>
  );
}

/** N, E, S and W printed round the compass face; the housing never turns, so N faces north. */
function CompassLetters() {
  const letters = {
    N: useLetterTexture('N', null, INK),
    E: useLetterTexture('E', null, INK),
    S: useLetterTexture('S', null, INK),
    W: useLetterTexture('W', null, INK),
  };
  const reach = COMPASS.radius * 0.7;
  const places = [
    { letter: letters.N, x: 0, z: -reach },
    { letter: letters.E, x: reach, z: 0 },
    { letter: letters.S, x: 0, z: reach },
    { letter: letters.W, x: -reach, z: 0 },
  ];
  return (
    <>
      {places.map(({ letter, x, z }) => (
        <group key={letter.uuid} position={[x, 0, z]}>
          <Letter texture={letter} side={0.011} height={FACE_HEIGHT + 0.0002} />
        </group>
      ))}
    </>
  );
}

/** An arrow printed on the bench, pointing north (away from the learner), with an N. */
function NorthMark() {
  const north = useLetterTexture('N', null, INK);
  const shaft = 0.05;
  return (
    <group position={[NORTH_MARK.x, 0.0002, NORTH_MARK.z]}>
      <mesh position={[0, 0, shaft / 2]}>
        <boxGeometry args={[0.003, 0.0004, shaft]} />
        <SurfaceMaterial kind="ink" />
      </mesh>
      {/* A flat triangle: a thin three-sided cylinder, its point turned to -z. */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -0.002]}>
        <cylinderGeometry args={[0.009, 0.009, 0.0004, 3]} />
        <SurfaceMaterial kind="ink" />
      </mesh>
      <group position={[0, 0, -0.026]}>
        <Letter texture={north} side={0.02} height={0.0004} />
      </group>
    </group>
  );
}
