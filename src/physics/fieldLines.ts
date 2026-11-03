import { add, scale, vec3, type Vec3 } from './vector';

/** Below this horizontal field (T) a line has no direction to follow. */
const NO_FIELD = 1e-12;

export interface FieldLineOptions {
  /** Length (m) of each step along the line. */
  readonly step: number;
  readonly maxSteps: number;
  /** Ends the line here, such as at a pole or the edge of the board. */
  stop(point: Vec3): boolean;
}

/**
 * Traces a field line across a level surface: it follows the horizontal part of the field,
 * which is what a compass needle or an iron filing lying flat lines up with. `direction` 1 runs
 * with the field (out of a north pole), -1 against it. Returns the points along the line,
 * starting with `start`, all at its height. Fourth-order Runge-Kutta on the field's direction,
 * so the step sets the spacing of the points, not how strong the field is.
 */
export function traceHorizontalFieldLine(
  fieldAt: (point: Vec3) => Vec3,
  start: Vec3,
  direction: 1 | -1,
  options: FieldLineOptions,
): Vec3[] {
  const heading = (point: Vec3): Vec3 | null => {
    const field = fieldAt(point);
    const size = Math.hypot(field.x, field.z);
    if (size < NO_FIELD) return null;
    return vec3((direction * field.x) / size, 0, (direction * field.z) / size);
  };

  const points = [start];
  let point = start;
  for (let step = 0; step < options.maxSteps; step++) {
    const h = options.step;
    const k1 = heading(point);
    if (k1 === null) break;
    const k2 = heading(add(point, scale(k1, h / 2)));
    if (k2 === null) break;
    const k3 = heading(add(point, scale(k2, h / 2)));
    if (k3 === null) break;
    const k4 = heading(add(point, scale(k3, h)));
    if (k4 === null) break;
    const move = scale(add(add(k1, scale(k2, 2)), add(scale(k3, 2), k4)), h / 6);
    point = add(point, move);
    points.push(point);
    if (options.stop(point)) break;
  }
  return points;
}
