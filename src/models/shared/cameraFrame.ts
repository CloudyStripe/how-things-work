// How a model's default camera is placed: each scene names the box that must fill the view and
// the angle to see it from, and the viewport works out the distance for the view's actual size.
// A bench lesson frames its apparatus this way, so it fills the model view on any window.

export type Vector3Tuple = [number, number, number];

export interface CameraFrame {
  /** The middle of what must be in view (metres). */
  readonly center: Vector3Tuple;
  /** Half its width, height and depth (metres): the box that fills the view. */
  readonly halfSize: Vector3Tuple;
  /** Degrees round from straight in front (from +z, the south) toward the right (+x, east). */
  readonly azimuth: number;
  /** Degrees above horizontal. */
  readonly elevation: number;
  /** Share of the view left clear around the box on its tightest side. */
  readonly margin: number;
}

export interface FramedCamera {
  readonly position: Vector3Tuple;
  readonly target: Vector3Tuple;
  /** From the camera to its target (metres). */
  readonly distance: number;
}

/**
 * The camera that sees `frame` from its angle and fills the view with it: every corner of the
 * box inside the view, the tightest side touching the margin, and the box centred on screen.
 * `verticalFov` is in degrees; `aspect` is the view's width over its height.
 */
export function framedCamera(
  frame: CameraFrame,
  verticalFov: number,
  aspect: number,
): FramedCamera {
  const azimuth = (frame.azimuth * Math.PI) / 180;
  const elevation = (frame.elevation * Math.PI) / 180;
  // From the target toward the camera, and the screen's right and up directions.
  const back: Vector3Tuple = [
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
  ];
  const right = normalize(cross([0, 1, 0], back));
  const up = cross(back, right);
  const tanUp = Math.tan((verticalFov * Math.PI) / 360) * (1 - frame.margin);
  const tanRight = tanUp * aspect;

  const [hx, hy, hz] = frame.halfSize;
  const corners: Vector3Tuple[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) corners.push([sx * hx, sy * hy, sz * hz]);
    }
  }

  /**
   * For a target moved by `offset` from the box's centre: the distance at which every corner
   * fits (|across| <= tan × (distance - toward), and likewise up), and how far off centre the
   * box then sits on screen.
   */
  const fit = (offset: Vector3Tuple) => {
    const local = corners.map((corner) => {
      const relative = sub(corner, offset);
      return [dot(relative, right), dot(relative, up), dot(relative, back)] as const;
    });
    const distance = Math.max(
      ...local.map(([across, upward, toward]) =>
        Math.max(toward + Math.abs(across) / tanRight, toward + Math.abs(upward) / tanUp),
      ),
    );
    const xs = local.map(([across, , toward]) => across / (distance - toward));
    const ys = local.map(([, upward, toward]) => upward / (distance - toward));
    const shift = add(
      scale(right, ((Math.min(...xs) + Math.max(...xs)) / 2) * distance),
      scale(up, ((Math.min(...ys) + Math.max(...ys)) / 2) * distance),
    );
    return { distance, shift };
  };

  // Perspective draws the near side larger, so recentre a few times, then fit once more.
  let offset: Vector3Tuple = [0, 0, 0];
  for (let pass = 0; pass < 4; pass++) offset = add(offset, fit(offset).shift);
  const { distance } = fit(offset);
  const target = add(frame.center, offset);
  return { position: add(target, scale(back, distance)), target, distance };
}

function add(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(a: Vector3Tuple, factor: number): Vector3Tuple {
  return [a[0] * factor, a[1] * factor, a[2] * factor];
}

function dot(a: Vector3Tuple, b: Vector3Tuple): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(a: Vector3Tuple): Vector3Tuple {
  return scale(a, 1 / Math.hypot(...a));
}
