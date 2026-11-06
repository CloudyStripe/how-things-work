import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Matrix4, Quaternion, Vector3, type Group, type InstancedMesh } from 'three';
import { OVERLAY_COLORS, POLE_COLORS } from '@/models/colors';
import { ILLUSTRATION_LINE } from '@/models/shared/surfaces';
import type { OverlayLayerProps } from '@/models/types';

// The generator overlay: inside the generator, its magnets spinning on the shaft and the coils
// round them, with dots running round each coil as fast as the current it makes, and reversing
// with it. It shows the generator slowed right down (a hundred times the blades' speed would be
// a blur), and larger than life, so it is tagged "not to scale". Drawn through the casing, as if
// it were cut away. Its materials count as transparent only so they draw after a see-through
// cover, and so stay on top of it.

const DOTS_PER_COIL = 8;
/** How far round a coil (rad/s) the dots go at the most current the lesson makes. */
const DOT_SPEED = 6;
/** A ring's own axis, before it is turned to face along its coil's. */
const FACING = new Vector3(0, 0, 1);
const HIDDEN = new Vector3(0, 0, 0);
/** How much larger than life the overlay draws the generator's insides. */
const ENLARGE = 1.8;

export function GeneratorOverlay({ model, getSnapshot }: OverlayLayerProps) {
  const first = useMemo(() => model.generatorView?.(getSnapshot()), [model, getSnapshot]);
  const magnets = useRef<(Group | null)[]>([]);
  const dots = useRef<InstancedMesh>(null);
  // How far round its coil each coil's dots have gone (rad).
  const travelled = useRef<number[]>([]);
  const scratch = useMemo(
    () => ({
      matrix: new Matrix4(),
      turn: new Quaternion(),
      point: new Vector3(),
      offset: new Vector3(),
      up: new Vector3(),
    }),
    [],
  );

  useFrame((_, delta) => {
    const view = model.generatorView?.(getSnapshot());
    if (view === undefined) return;
    view.magnets.forEach((magnet, index) => {
      const group = magnets.current[index];
      if (!group) return;
      group.position.set(magnet.position.x, magnet.position.y, magnet.position.z);
      group.rotation.set(0, 0, Math.atan2(magnet.outward.y, magnet.outward.x));
    });
    const mesh = dots.current;
    if (!mesh) return;
    view.coils.forEach((coil, index) => {
      const moved = (travelled.current[index] ?? 0) + coil.current * DOT_SPEED * delta;
      travelled.current[index] = moved;
      // Round the coil, in the plane across its axis.
      scratch.up.set(coil.axis.x, coil.axis.y, coil.axis.z);
      scratch.turn.setFromUnitVectors(FACING, scratch.up);
      for (let dot = 0; dot < DOTS_PER_COIL; dot++) {
        const angle = moved + (dot / DOTS_PER_COIL) * 2 * Math.PI;
        const lit = Math.abs(coil.current) > 0.03;
        scratch.point
          .set(Math.cos(angle) * coil.radius * 1.25, Math.sin(angle) * coil.radius * 1.25, 0)
          .applyQuaternion(scratch.turn)
          .add(scratch.offset.set(coil.center.x, coil.center.y, coil.center.z));
        scratch.matrix.makeTranslation(scratch.point.x, scratch.point.y, scratch.point.z);
        if (!lit) scratch.matrix.scale(HIDDEN);
        mesh.setMatrixAt(index * DOTS_PER_COIL + dot, scratch.matrix);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (first === undefined) return null;
  // Drawn larger than life about the generator's middle, so its parts read from outside.
  const middle = first.coils
    .reduce(
      (sum, coil) => sum.add(new Vector3(coil.center.x, coil.center.y, coil.center.z)),
      new Vector3(),
    )
    .divideScalar(Math.max(1, first.coils.length));
  return (
    <group position={middle} scale={ENLARGE} renderOrder={20}>
      {/* A plate behind it, so it reads against the parts' colours. */}
      <Billboard>
        <mesh renderOrder={19}>
          <circleGeometry args={[1.5, 48]} />
          <meshBasicMaterial
            color={OVERLAY_COLORS.plate}
            opacity={OVERLAY_COLORS.plateOpacity}
            depthTest={false}
            transparent
          />
        </mesh>
        <mesh renderOrder={19}>
          <ringGeometry args={[1.5, 1.53, 64]} />
          <meshBasicMaterial color={ILLUSTRATION_LINE} depthTest={false} transparent />
        </mesh>
      </Billboard>
      <group position={middle.clone().negate()}>
        {first.magnets.map((magnet, index) => (
          <group
            key={index}
            ref={(group) => {
              magnets.current[index] = group;
            }}
          >
            {/* Lying out from the shaft: its outer half shows the pole that faces the coils. */}
            <mesh position={[0.12, 0, 0]} renderOrder={20}>
              <boxGeometry args={[0.24, 0.3, 0.9]} />
              <meshBasicMaterial
                color={magnet.north ? POLE_COLORS.north : POLE_COLORS.south}
                depthTest={false}
                transparent
              />
            </mesh>
            <mesh position={[-0.12, 0, 0]} renderOrder={20}>
              <boxGeometry args={[0.24, 0.3, 0.9]} />
              <meshBasicMaterial
                color={magnet.north ? POLE_COLORS.south : POLE_COLORS.north}
                depthTest={false}
                transparent
              />
            </mesh>
          </group>
        ))}
        {first.coils.map((coil, index) => (
          <Coil key={index} center={coil.center} axis={coil.axis} radius={coil.radius} />
        ))}
        <instancedMesh
          ref={dots}
          args={[undefined, undefined, first.coils.length * DOTS_PER_COIL]}
          frustumCulled={false}
          renderOrder={21}
        >
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshBasicMaterial color={OVERLAY_COLORS.current} depthTest={false} transparent />
        </instancedMesh>
      </group>
    </group>
  );
}

/** A coil, as a ring facing the shaft. */
function Coil({
  center,
  axis,
  radius,
}: {
  center: { x: number; y: number; z: number };
  axis: { x: number; y: number; z: number };
  radius: number;
}) {
  const turn = useMemo(
    () => new Quaternion().setFromUnitVectors(FACING, new Vector3(axis.x, axis.y, axis.z)),
    [axis],
  );
  return (
    <mesh position={[center.x, center.y, center.z]} quaternion={turn} renderOrder={20}>
      <torusGeometry args={[radius * 1.25, 0.05, 10, 32]} />
      <meshBasicMaterial color={OVERLAY_COLORS.coil} depthTest={false} transparent />
    </mesh>
  );
}
