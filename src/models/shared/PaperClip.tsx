import { useMemo } from 'react';
import { CatmullRomCurve3, Vector3 } from 'three';
import { SurfaceMaterial } from './surfaces';

interface PaperClipProps {
  /** End to end, and side to side (m). */
  readonly length: number;
  readonly width: number;
  /** Radius of the steel wire (m). */
  readonly wire: number;
}

/** A steel paper clip lying flat with its length along x: a wire bent into three nested loops. */
export function PaperClip({ length, width, wire }: PaperClipProps) {
  const curve = useMemo(
    () => new CatmullRomCurve3(clipPath(length, width), false, 'centripetal'),
    [length, width],
  );
  // Twelve sides round the wire: smooth enough that no outline runs along it.
  return (
    <mesh>
      <tubeGeometry args={[curve, 160, wire, 12, false]} />
      <SurfaceMaterial kind="steel" />
    </mesh>
  );
}

/** A paper clip's wire, centred and lying flat: three straight runs joined by half turns. */
function clipPath(length: number, width: number): Vector3[] {
  const half = length / 2;
  const outer = width / 2;
  const middle = outer * 0.72;
  const inner = outer * 0.45;
  const points: Vector3[] = [];
  const run = (fromX: number, toX: number, z: number) => {
    for (let i = 0; i <= 6; i++) points.push(new Vector3(fromX + ((toX - fromX) * i) / 6, 0, z));
  };
  /** Half a turn round a centre, starting at angle `from` (x = cos, z = sin). */
  const turn = (centerX: number, centerZ: number, radius: number, from: number) => {
    for (let i = 1; i < 10; i++) {
      const angle = from + (Math.PI * i) / 10;
      points.push(
        new Vector3(centerX + radius * Math.cos(angle), 0, centerZ + radius * Math.sin(angle)),
      );
    }
  };
  // From the inner end outward: the inner loop at the left, the middle at the right, the outer
  // round them both.
  run(half * 0.1, -half + inner, inner);
  turn(-half + inner, 0, inner, Math.PI / 2);
  run(-half + inner, half - middle, -inner);
  turn(half - middle, middle - inner, middle, -Math.PI / 2);
  run(half - middle, -half + outer, 2 * middle - inner);
  turn(-half + outer, 2 * middle - inner - outer, outer, Math.PI / 2);
  run(-half + outer, half * 0.45, 2 * middle - inner - 2 * outer);
  const zs = points.map((point) => point.z);
  const shift = (Math.max(...zs) + Math.min(...zs)) / 2;
  return points.map((point) => point.setZ(point.z - shift));
}
