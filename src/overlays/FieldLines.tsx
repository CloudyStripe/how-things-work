import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import type { AnyModel, OverlayLayerProps } from '@/models/types';
import { dot, length, scale, sub, type Coil, type Vec3 } from '@/physics';
import { fieldLinePaths, type FieldLinePath } from './fieldLinePaths';

// Magnetic field lines with direction arrows, traced through the physics core's field across the
// model's overlay area, and the magnetic flux overlay built on them. They are traced again only
// when a source moves, so a fixed magnet costs one tracing. How many lines leave a pole is a choice, so the overlay is tagged "not to scale";
// the lines still crowd where the field is strongest.

/** A violet that is none of the palette's colours: not a magnet's red or blue, not wood. */
const FIELD_LINE_COLOR = '#7a3db8';
/** The same violet, washed out: lines that miss the coil, in the flux overlay. */
const FAINT_COLOR = '#c9b3e3';
const ARROW = { radius: 0.0022, length: 0.006 };
/** Up to this half-width of overlay area (m), arrows keep their own size. */
const ARROW_AREA = 0.12;
/** Shortest time (s) between tracings while a source moves. */
const RETRACE_INTERVAL = 0.25;
/** Lifted a little off the surface they are drawn on, so they stay on top of it. */
const LIFT = 0.0006;

export function FieldLines({ model, getSnapshot }: OverlayLayerProps) {
  const paths = useTracedPaths(model, getSnapshot);
  return (
    <group position={[0, LIFT, 0]}>
      {paths.map((path, index) => (
        <FieldLine key={index} path={path} arrowSize={arrowSize(model)} />
      ))}
    </group>
  );
}

/**
 * Magnetic flux: the same field lines, with the ones that pass through the model's coil drawn
 * bold and the rest faint. As a magnet nears or enters the coil, more lines thread it.
 */
export function FluxLines({ model, getSnapshot }: OverlayLayerProps) {
  const paths = useTracedPaths(model, getSnapshot);
  const coil = model.fluxCoil;
  return (
    <group position={[0, LIFT, 0]}>
      {paths.map((path, index) => {
        const threads = coil !== undefined && path.points.some((point) => insideCoil(coil, point));
        return <FieldLine key={index} path={path} arrowSize={arrowSize(model)} faint={!threads} />;
      })}
    </group>
  );
}

/** The model's field lines, traced again when a source moves (a few times a second at most). */
function useTracedPaths(model: AnyModel, getSnapshot: OverlayLayerProps['getSnapshot']) {
  const [traced, setTraced] = useState<{ key: string; at: number; paths: FieldLinePath[] }>();

  useFrame(({ clock }) => {
    const sources = model.fieldSources(getSnapshot());
    const key = JSON.stringify(sources);
    const now = clock.elapsedTime;
    if (traced === undefined || (traced.key !== key && now - traced.at >= RETRACE_INTERVAL)) {
      setTraced({ key, at: now, paths: fieldLinePaths(sources, model.overlayRegion) });
    }
  });

  return traced?.paths ?? [];
}

/** Arrows grow with the area, so they stay readable on a wide bench seen from further off. */
function arrowSize(model: AnyModel): number {
  return Math.max(1, model.overlayRegion.halfWidth / ARROW_AREA);
}

function insideCoil(coil: Coil, point: Vec3): boolean {
  const offset = sub(point, coil.center);
  const along = dot(offset, coil.axis);
  return (
    Math.abs(along) <= coil.length / 2 &&
    length(sub(offset, scale(coil.axis, along))) <= coil.radius
  );
}

function FieldLine({
  path,
  arrowSize,
  faint = false,
}: {
  path: FieldLinePath;
  arrowSize: number;
  faint?: boolean;
}) {
  const points = path.points.map((point) => [point.x, point.y, point.z] as const);
  const middle = Math.floor(path.points.length / 2);
  const at = path.points[middle];
  const next = path.points[middle + 1];
  return (
    <>
      <Line
        points={points.map((point) => [...point])}
        color={faint ? FAINT_COLOR : FIELD_LINE_COLOR}
        lineWidth={faint ? 1.2 : 2.6}
      />
      {at !== undefined && next !== undefined && (
        <Arrowhead
          at={at}
          toward={next}
          size={arrowSize}
          color={faint ? FAINT_COLOR : FIELD_LINE_COLOR}
        />
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
