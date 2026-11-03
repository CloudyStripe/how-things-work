import { BufferGeometry, Float32BufferAttribute } from 'three';

// A wind turbine blade's shape: round at the root where it bolts to the hub, then an aerofoil
// that is widest a fifth of the way out and tapers and twists toward the tip. Built as one mesh,
// lying along +y from its root, its chord along x and its thickness along z.

interface BladeShape {
  /** From root to tip (m). */
  readonly length: number;
  readonly rootChord: number;
  readonly tipChord: number;
}

/** Sections along the span, and points round each section. */
const STATIONS = 18;
const POINTS = 24;
/** Diameter of the round root (m), and how far out it turns into an aerofoil (share of span). */
const ROOT_DIAMETER = 2;
const ROOT_SPAN = 0.12;
/** Twist at the root (rad): the blade turns flatter toward the tip, where it moves fastest. */
const ROOT_TWIST = (16 * Math.PI) / 180;

/** Half-thickness of a symmetric aerofoil at a fraction u of its chord (NACA four-digit form). */
function halfThickness(u: number, ratio: number): number {
  return (
    5 *
    ratio *
    (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u ** 2 + 0.2843 * u ** 3 - 0.1036 * u ** 4)
  );
}

/** The section at a share s of the span: points round it, (x along chord, z across). */
function section(s: number, shape: BladeShape): [number, number][] {
  // Widest at a fifth of the span, tapering straight to the tip.
  const chord =
    s < 0.2
      ? ROOT_DIAMETER + ((shape.rootChord - ROOT_DIAMETER) * s) / 0.2
      : shape.rootChord + ((shape.tipChord - shape.rootChord) * (s - 0.2)) / 0.8;
  // Thick near the root, thin at the tip.
  const ratio = 0.4 - 0.28 * Math.min(1, s / 0.6);
  const round = Math.max(0, 1 - s / ROOT_SPAN);
  const points: [number, number][] = [];
  for (let k = 0; k < POINTS; k++) {
    // Round the section from the trailing edge, along the top to the leading edge and back.
    const t = (k / POINTS) * 2 * Math.PI;
    const u = 0.5 * (1 + Math.cos(t));
    const side = t < Math.PI ? 1 : -1;
    // The pitch axis sits a quarter of the chord back from the leading edge.
    const foil: [number, number] = [
      (0.25 - (1 - u)) * chord,
      side * halfThickness(u, ratio) * chord,
    ];
    const circle: [number, number] = [
      (Math.cos(t) * ROOT_DIAMETER) / 2,
      (Math.sin(t) * ROOT_DIAMETER) / 2,
    ];
    points.push([
      foil[0] * (1 - round) + circle[0] * round,
      foil[1] * (1 - round) + circle[1] * round,
    ]);
  }
  return points;
}

export function bladeGeometry(shape: BladeShape): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let station = 0; station <= STATIONS; station++) {
    const s = station / STATIONS;
    const twist = ROOT_TWIST * (1 - s) ** 1.5;
    const cos = Math.cos(twist);
    const sin = Math.sin(twist);
    for (const [x, z] of section(s, shape)) {
      positions.push(x * cos - z * sin, s * shape.length, x * sin + z * cos);
    }
  }
  for (let station = 0; station < STATIONS; station++) {
    for (let k = 0; k < POINTS; k++) {
      const a = station * POINTS + k;
      const b = station * POINTS + ((k + 1) % POINTS);
      const c = a + POINTS;
      const d = b + POINTS;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Close the tip and the root with a fan round a centre point.
  for (const station of [0, STATIONS]) {
    const centre = positions.length / 3;
    positions.push(0, (station / STATIONS) * shape.length, 0);
    for (let k = 0; k < POINTS; k++) {
      const a = station * POINTS + k;
      const b = station * POINTS + ((k + 1) % POINTS);
      if (station === 0) indices.push(centre, b, a);
      else indices.push(centre, a, b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
