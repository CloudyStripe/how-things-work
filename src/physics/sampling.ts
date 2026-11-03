import { vec3, type Vec3 } from './vector';

export interface PlaneGrid {
  /** Centre of the sampled area (m); its height is the plane's. */
  readonly center: Vec3;
  /** Half the area's extent along x and along z (m). */
  readonly halfWidth: number;
  readonly halfDepth: number;
  /** Distance between samples (m). */
  readonly spacing: number;
}

/**
 * A field sampled once on a level grid and read back by bilinear interpolation, for a source
 * that does not move and many points that read it every frame (iron filings on glass). Outside
 * the area it reads the nearest edge. It knows only its own height: its field does not vary
 * with y, so a gradient taken from it has no vertical part.
 */
export function sampledPlaneField(
  fieldAt: (point: Vec3) => Vec3,
  grid: PlaneGrid,
): (point: Vec3) => Vec3 {
  const columns = Math.round((2 * grid.halfWidth) / grid.spacing) + 1;
  const rows = Math.round((2 * grid.halfDepth) / grid.spacing) + 1;
  const left = grid.center.x - grid.halfWidth;
  const back = grid.center.z - grid.halfDepth;
  const samples = new Float64Array(columns * rows * 3);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const field = fieldAt(
        vec3(left + column * grid.spacing, grid.center.y, back + row * grid.spacing),
      );
      const index = (row * columns + column) * 3;
      samples[index] = field.x;
      samples[index + 1] = field.y;
      samples[index + 2] = field.z;
    }
  }

  return (point) => {
    const u = clamp((point.x - left) / grid.spacing, 0, columns - 1);
    const v = clamp((point.z - back) / grid.spacing, 0, rows - 1);
    const column = Math.min(Math.floor(u), columns - 2);
    const row = Math.min(Math.floor(v), rows - 2);
    const fu = u - column;
    const fv = v - row;
    const component = (axis: number) => {
      const at = (r: number, c: number) => samples[(r * columns + c) * 3 + axis] ?? 0;
      const top = at(row, column) * (1 - fu) + at(row, column + 1) * fu;
      const bottom = at(row + 1, column) * (1 - fu) + at(row + 1, column + 1) * fu;
      return top * (1 - fv) + bottom * fv;
    };
    return vec3(component(0), component(1), component(2));
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
