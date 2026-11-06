import { Line } from '@react-three/drei';
import { OVERLAY_COLORS } from '@/models/colors';
import type { OverlayLayerProps } from '@/models/types';
import { compassBearing, earthField, vec3 } from '@/physics';
import { Arrowhead } from './FieldLines';

// Earth's field across the bench: faint, evenly spaced lines all running the way its horizontal
// part points (north), because over a bench it is the same everywhere. Their spacing is a choice,
// so the overlay is tagged "not to scale".

const COLOR = OVERLAY_COLORS.earthField;
const LINES = 6;
const ARROWS_PER_LINE = 3;
const LIFT = 0.0004;

export function EarthField({ model }: OverlayLayerProps) {
  const { center, halfWidth } = model.overlayRegion;
  const halfDepth = model.overlayRegion.halfDepth ?? halfWidth;
  const bearing = compassBearing(earthField()) ?? 0;
  // A unit step north (bearing 0 is -z) and one across, to the right of it.
  const along = { x: Math.sin(bearing), z: -Math.cos(bearing) };
  const across = { x: Math.cos(bearing), z: Math.sin(bearing) };
  // How far the area reaches along the lines, and across them.
  const length = Math.abs(along.x) * halfWidth + Math.abs(along.z) * halfDepth;
  const spread = Math.abs(across.x) * halfWidth + Math.abs(across.z) * halfDepth;
  const y = center.y + LIFT;

  return (
    <group>
      {Array.from({ length: LINES }, (_, line) => {
        const offset = ((line + 0.5) / LINES - 0.5) * 2 * spread;
        const middle = vec3(center.x + across.x * offset, y, center.z + across.z * offset);
        const end = (sign: number) =>
          [middle.x + sign * along.x * length, y, middle.z + sign * along.z * length] as [
            number,
            number,
            number,
          ];
        return (
          <group key={line}>
            <Line
              points={[end(-1), end(1)]}
              color={COLOR}
              lineWidth={1.5}
              transparent
              opacity={0.8}
            />
            {Array.from({ length: ARROWS_PER_LINE }, (_, arrow) => {
              const share = ((arrow + 0.5) / ARROWS_PER_LINE - 0.5) * 2 * length;
              const at = vec3(middle.x + along.x * share, y, middle.z + along.z * share);
              const toward = vec3(at.x + along.x, y, at.z + along.z);
              return <Arrowhead key={arrow} at={at} toward={toward} color={COLOR} size={2} />;
            })}
          </group>
        );
      })}
    </group>
  );
}
