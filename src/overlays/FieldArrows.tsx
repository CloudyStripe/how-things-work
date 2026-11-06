import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Matrix4, type InstancedMesh } from 'three';
import { OVERLAY_COLORS } from '@/models/colors';
import type { OverlayLayerProps } from '@/models/types';
import { compassBearing, length, netField, sub, vec3, type Vec3 } from '@/physics';

// A grid of arrows on the board showing the direction a compass would point at each spot:
// the horizontal direction of the net field from the model's sources. Every arrow has the same
// length, so the overlay shows direction only and is tagged "not to scale".

const GRID = 13;
const ARROW_LENGTH = 0.006;
const ARROW_RADIUS = 0.0012;
/** No arrows this close to a wire (metres). */
const WIRE_CLEARANCE = 0.006;
const LIFT = 0.0012;

export function FieldArrows({ model, getSnapshot }: OverlayLayerProps) {
  const mesh = useRef<InstancedMesh>(null);
  const { center, halfWidth } = model.overlayRegion;

  const points = useMemo(() => {
    const spacing = (2 * halfWidth) / (GRID - 1);
    const grid: Vec3[] = [];
    for (let row = 0; row < GRID; row++) {
      for (let column = 0; column < GRID; column++) {
        grid.push(
          vec3(
            center.x - halfWidth + column * spacing,
            center.y + LIFT,
            center.z - halfWidth + row * spacing,
          ),
        );
      }
    }
    return grid;
  }, [center, halfWidth]);

  const scratch = useMemo(
    () => ({ tilt: new Matrix4().makeRotationX(-Math.PI / 2), matrix: new Matrix4() }),
    [],
  );

  useFrame(() => {
    if (!mesh.current) return;
    const sources = model.fieldSources(getSnapshot());
    points.forEach((point, index) => {
      const nearWire = sources.wires.some(
        (wire) => horizontalDistance(point, wire.point) < WIRE_CLEARANCE,
      );
      const bearing = compassBearing(netField(sources, point));
      if (nearWire || bearing === null) {
        // Hidden: scaled to nothing.
        scratch.matrix.makeScale(0, 0, 0);
      } else {
        // Lay the cone flat pointing north, then turn it to the bearing.
        scratch.matrix.makeRotationY(-bearing).multiply(scratch.tilt);
        scratch.matrix.setPosition(point.x, point.y, point.z);
      }
      mesh.current?.setMatrixAt(index, scratch.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, points.length]}>
      <coneGeometry args={[ARROW_RADIUS, ARROW_LENGTH, 8]} />
      <meshBasicMaterial color={OVERLAY_COLORS.fieldLine} />
    </instancedMesh>
  );
}

function horizontalDistance(a: Vec3, b: Vec3): number {
  const offset = sub(a, b);
  return length(vec3(offset.x, 0, offset.z));
}
