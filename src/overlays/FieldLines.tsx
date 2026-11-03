import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import type { OverlayLayerProps } from '@/models/types';
import type { Vec3 } from '@/physics';
import { fieldLinePaths, type FieldLinePath } from './fieldLinePaths';

// Magnetic field lines with direction arrows, traced through the physics core's field across the
// model's overlay area. They are traced again only when a source moves, so a fixed magnet costs
// one tracing. How many lines leave a pole is a choice, so the overlay is tagged "not to scale";
// the lines still crowd where the field is strongest.

/** A violet that is none of the palette's colours: not a magnet's red or blue, not wood. */
const FIELD_LINE_COLOR = '#7a3db8';
const ARROW = { radius: 0.0022, length: 0.006 };
/** Up to this half-width of overlay area (m), arrows keep their own size. */
const ARROW_AREA = 0.12;
/** Shortest time (s) between tracings while a source moves. */
const RETRACE_INTERVAL = 0.25;
/** Lifted a little off the surface they are drawn on, so they stay on top of it. */
const LIFT = 0.0006;

export function FieldLines({ model, getSnapshot }: OverlayLayerProps) {
  const [traced, setTraced] = useState<{ key: string; at: number; paths: FieldLinePath[] }>();

  useFrame(({ clock }) => {
    const sources = model.fieldSources(getSnapshot());
    const key = JSON.stringify(sources);
    const now = clock.elapsedTime;
    // While a source keeps moving, trace a few times a second rather than every frame.
    if (traced === undefined || (traced.key !== key && now - traced.at >= RETRACE_INTERVAL)) {
      setTraced({ key, at: now, paths: fieldLinePaths(sources, model.overlayRegion) });
    }
  });

  // Arrows grow with the area, so they stay readable on a wide bench seen from further off.
  const arrowSize = Math.max(1, model.overlayRegion.halfWidth / ARROW_AREA);

  return (
    <group position={[0, LIFT, 0]}>
      {traced?.paths.map((path, index) => (
        <FieldLine key={index} path={path} arrowSize={arrowSize} />
      ))}
    </group>
  );
}

function FieldLine({ path, arrowSize }: { path: FieldLinePath; arrowSize: number }) {
  const points = path.points.map((point) => [point.x, point.y, point.z] as const);
  const middle = Math.floor(path.points.length / 2);
  const at = path.points[middle];
  const next = path.points[middle + 1];
  return (
    <>
      <Line points={points.map((point) => [...point])} color={FIELD_LINE_COLOR} lineWidth={2} />
      {at !== undefined && next !== undefined && (
        <Arrowhead at={at} toward={next} size={arrowSize} />
      )}
    </>
  );
}

/** A small flat cone on the line, pointing the way the field runs; size scales it. */
export function Arrowhead({
  at,
  toward,
  color = FIELD_LINE_COLOR,
  size = 1,
}: {
  at: Vec3;
  toward: Vec3;
  color?: string;
  size?: number;
}) {
  // A cone points up (+y); lay it flat, then turn it to the line's bearing.
  const bearing = Math.atan2(toward.x - at.x, -(toward.z - at.z));
  return (
    <group position={[at.x, at.y, at.z]} rotation={[0, -bearing, 0]} scale={size}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[ARROW.radius, ARROW.length, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
