import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Matrix4, type InstancedMesh } from 'three';
import type { CurrentPath, OverlayLayerProps } from '@/models/types';
import type { Vec3 } from '@/physics';

// Current flow: evenly spaced dots in the wires, moving the way the current runs at a speed in
// proportion to it. With no current they stand still: the loop is still there, nothing flows.
// The speed is chosen for the eye, so the overlay is tagged "not to scale".

/** A teal that is none of the palette's colours, nor the field lines' violet. */
const COLOR = '#139fb3';
const SPACING = 0.012;
const RADIUS = 0.0017;
const CAPACITY = 600;
/** Speed (m/s per ampere) when a model does not set its own. */
const DEFAULT_FLOW_SPEED = 0.05;

export function CurrentFlow({ model, getSnapshot }: OverlayLayerProps) {
  const mesh = useRef<InstancedMesh>(null);
  // How far the dots on each path have moved along it (m).
  const travelled = useRef<number[]>([]);
  const matrix = useMemo(() => new Matrix4(), []);
  const hidden = useMemo(() => new Matrix4().makeScale(0, 0, 0), []);
  const speed = model.flowSpeed ?? DEFAULT_FLOW_SPEED;

  useFrame((_, delta) => {
    if (mesh.current === null) return;
    const paths = model.currentPaths?.(getSnapshot()) ?? [];
    let index = 0;
    paths.forEach((path, pathIndex) => {
      const moved = (travelled.current[pathIndex] ?? 0) + path.current * speed * delta;
      travelled.current[pathIndex] = moved;
      for (const point of dotsAlong(path, moved)) {
        if (index >= CAPACITY) return;
        matrix.makeTranslation(point.x, point.y, point.z);
        mesh.current?.setMatrixAt(index, matrix);
        index++;
      }
    });
    for (; index < CAPACITY; index++) mesh.current.setMatrixAt(index, hidden);
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, CAPACITY]}
      frustumCulled={false}
      renderOrder={10}
    >
      <sphereGeometry args={[RADIUS, 10, 8]} />
      {/* Drawn over the plastic coating: the current runs in the copper inside it. */}
      <meshBasicMaterial color={COLOR} depthTest={false} />
    </instancedMesh>
  );
}

/** Points every SPACING along a path, shifted along it by `offset` (m). */
function dotsAlong(path: CurrentPath, offset: number): Vec3[] {
  const { points } = path;
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a === undefined || b === undefined) continue;
    lengths.push((lengths.at(-1) ?? 0) + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  const total = lengths.at(-1) ?? 0;
  if (total === 0) return [];
  const dots: Vec3[] = [];
  const start = ((offset % SPACING) + SPACING) % SPACING;
  let segment = 1;
  for (let distance = start; distance < total; distance += SPACING) {
    while ((lengths[segment] ?? total) < distance) segment++;
    const a = points[segment - 1];
    const b = points[segment];
    const from = lengths[segment - 1] ?? 0;
    const span = (lengths[segment] ?? total) - from;
    if (a === undefined || b === undefined || span === 0) continue;
    const t = (distance - from) / span;
    dots.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
  }
  return dots;
}
