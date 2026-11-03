import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { BarMagnet, Letter } from '../shared/BarMagnet';
import { Compass } from '../shared/Compass';
import { useLetterTexture } from '../shared/labelTexture';
import { Block, SurfaceMaterial } from '../shared/surfaces';
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

// The compass bench: a painted bar magnet, a brass compass, and an arrow printed on the bench
// pointing north. The compass's place and the needle's angle come from the simulation each
// frame.

/** The bench top: wide enough that its edges stay out of the default view. */
const TABLETOP = { width: 2.4, depth: 1.6 };
const INK = '#3a3c40';

export function CompassBenchScene({ getSnapshot, interactive, setControl }: SceneProps) {
  const compass = useRef<Group>(null);
  // The engine pairs this scene only with its own model, so the state is this model's.
  const state = () => getSnapshot().state as CompassBenchState;

  useFrame(() => {
    const current = state();
    compass.current?.position.set(current.compass.x, 0, current.compass.z);
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
        <Compass
          radius={COMPASS.radius}
          needleHeight={COMPASS.needleHeight}
          getAngle={() => state().needle.angle}
          letters
        />
      </group>
    </group>
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
