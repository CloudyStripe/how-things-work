import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { SceneProps } from '../types';
import { COMPASS_POSITION, type PlaceholderState } from './definition';

// Plain grey shapes only: the visual style is chosen in Phase 4. The needle's angle comes from
// the simulation every frame; nothing here animates on its own.

const BOARD_SIZE = 0.16;
const BOARD_THICKNESS = 0.01;
const WIRE_LENGTH = 0.12;
const COMPASS_RADIUS = 0.009;
const NEEDLE_LENGTH = 0.0075;

export function PlaceholderWireCompassScene({ getSnapshot }: SceneProps) {
  const needle = useRef<Group>(null);

  useFrame(() => {
    // The engine pairs this scene only with its own model, so the state is this model's.
    const state = getSnapshot().state as PlaceholderState;
    // A bearing is clockwise from north seen from above; three.js turns counterclockwise.
    if (needle.current) needle.current.rotation.y = -state.needle.angle;
  });

  return (
    <group>
      <mesh position={[0, -BOARD_THICKNESS / 2, 0]}>
        <boxGeometry args={[BOARD_SIZE, BOARD_THICKNESS, BOARD_SIZE]} />
        <meshStandardMaterial color="#c4c4bf" />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.0015, 0.0015, WIRE_LENGTH, 16]} />
        <meshStandardMaterial color="#8a8a86" />
      </mesh>
      <group position={[COMPASS_POSITION.x, 0.002, COMPASS_POSITION.z]}>
        <mesh>
          <cylinderGeometry args={[COMPASS_RADIUS, COMPASS_RADIUS, 0.004, 32]} />
          <meshStandardMaterial color="#ececea" />
        </mesh>
        <group ref={needle} position={[0, 0.0025, 0]}>
          {/* North end, pointing along -z (north) before the needle turns. */}
          <mesh position={[0, 0, -NEEDLE_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.0014, NEEDLE_LENGTH, 12]} />
            <meshStandardMaterial color="#b03a2e" />
          </mesh>
          <mesh position={[0, 0, NEEDLE_LENGTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.0014, NEEDLE_LENGTH, 12]} />
            <meshStandardMaterial color="#9a9a96" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
