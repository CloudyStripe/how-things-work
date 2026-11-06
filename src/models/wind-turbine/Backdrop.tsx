import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  RingGeometry,
  Shape,
  ExtrudeGeometry,
  SphereGeometry,
  type Group,
} from 'three';
import { Block, Outline, SurfaceMaterial } from '../shared/surfaces';
import { HUB_HEIGHT, LAYOUT, type TurbineState } from './definition';

// The land around the turbine. A sky gradient, ground fading to the horizon, three ridges and a few
// distant turbines paler with distance, a shadow where the tower meets the ground, and a house for
// scale. Everything far away is unlit and unoutlined, so the machine stays the only thing drawn as an
// illustration.

/** Colours set by hand for aerial perspective: each is paler the farther away it is. */
const SCENERY = {
  /** Bottom to top: the horizon, low sky, high sky, overhead. */
  sky: ['#f4f8f9', '#d3e8f1', '#9dcbe6', '#6ea8d6'],
  /** At the tower, and at the horizon. */
  ground: ['#a3c587', '#c9dfa9'],
  /** Nearest ridge to farthest, each as its crest and its misty foot. */
  hills: [
    ['#6d9f69', '#bcd79a'],
    ['#8bb49b', '#b6d1bb'],
    ['#adcad1', '#d0e1de'],
  ],
  /** The nearest distant turbine, and the farthest. */
  distantTurbines: ['#ffffff', '#d9e7ef'],
  shadow: '#1b2420',
  shadowStrength: 0.45,
} as const;

/** Must stay inside the camera's far plane at the widest zoom. */
const WORLD_RADIUS = 2400;
const HILL_RADII = [1600, 2000, 2300];
const HILL_HEIGHTS = [70, 110, 150];
/** The side of the world the opening view looks toward (degrees, as a camera azimuth). */
const AWAY = 216;
/** Round the world (degrees, away from the opening view) and how far out (m). */
const DISTANT_TURBINES: readonly (readonly [number, number])[] = [
  [-11, 900],
  [-6, 1520],
  [4, 1180],
  [10, 1500],
  [13, 800],
  [80, 1300],
  [-80, 1400],
  [170, 1250],
  [-160, 1450],
];

export function Backdrop({ getSnapshot }: { getSnapshot: () => { state: unknown } }) {
  const rotors = useRef<(Group | null)[]>([]);
  const sky = useMemo(() => skyGeometry(SCENERY.sky), []);
  const ground = useMemo(() => groundGeometry(SCENERY.ground), []);
  const hills = useMemo(
    () =>
      SCENERY.hills.map((colors, index) =>
        hillGeometry(HILL_RADII[index] ?? WORLD_RADIUS, HILL_HEIGHTS[index] ?? 100, index, colors),
      ),
    [],
  );
  const shadow = useMemo(() => softShadow(), []);

  useFrame(() => {
    const { angle } = getSnapshot().state as TurbineState;
    rotors.current.forEach((rotor, index) => {
      if (rotor) rotor.rotation.z = -angle * (0.8 + (index % 3) * 0.1) + index;
    });
  });

  return (
    <group>
      <mesh geometry={sky}>
        <meshBasicMaterial vertexColors side={BackSide} depthWrite={false} fog={false} />
      </mesh>
      <mesh geometry={ground}>
        <meshBasicMaterial vertexColors />
      </mesh>
      {hills.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshBasicMaterial vertexColors side={DoubleSide} />
        </mesh>
      ))}
      {DISTANT_TURBINES.map(([offset, distance], index) => {
        const azimuth = ((AWAY + offset) * Math.PI) / 180;
        const share = Math.min(1, (distance - 800) / 720);
        const color = new Color(SCENERY.distantTurbines[0]).lerp(
          new Color(SCENERY.distantTurbines[1]),
          share,
        );
        return (
          <group
            key={index}
            position={[Math.sin(azimuth) * distance, 0, Math.cos(azimuth) * distance]}
          >
            <mesh position={[0, HUB_HEIGHT / 2, 0]}>
              <cylinderGeometry args={[1.4, 2.4, HUB_HEIGHT, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <mesh position={[0, HUB_HEIGHT, -2]}>
              <boxGeometry args={[3, 3.4, 9]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <group
              position={[0, HUB_HEIGHT, 3]}
              ref={(rotor) => {
                rotors.current[index] = rotor;
              }}
            >
              {[0, 1, 2].map((blade) => (
                <mesh
                  key={blade}
                  rotation={[0, 0, (blade * 2 * Math.PI) / 3]}
                  position={[
                    -Math.sin((blade * 2 * Math.PI) / 3) * 21,
                    Math.cos((blade * 2 * Math.PI) / 3) * 21,
                    0,
                  ]}
                >
                  <boxGeometry args={[2.6, 42, 0.5]} />
                  <meshBasicMaterial color={color} />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}

      {/* Where the tower meets the ground. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[LAYOUT.tower.baseRadius * 5, 48]} />
        <meshBasicMaterial
          map={shadow}
          color={SCENERY.shadow}
          transparent
          opacity={SCENERY.shadowStrength}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[LAYOUT.tower.baseRadius * 2.2, 48]} />
        <meshBasicMaterial
          map={shadow}
          color={SCENERY.shadow}
          transparent
          opacity={SCENERY.shadowStrength * 1.6}
          depthWrite={false}
        />
      </mesh>

      <House shadowMap={shadow} />
      <Tree position={[-30, 0, -6]} height={14} />
      <Tree position={[-38, 0, 2]} height={11} />
      <Tree position={[41, 0, -24]} height={13} />
    </group>
  );
}

/** A two-storey house about the size of a real one: ten metres wide, nine to the ridge. */
function House({ shadowMap }: { shadowMap: CanvasTexture }) {
  const roof = useMemo(() => {
    const profile = new Shape();
    profile.moveTo(-4.4, 0);
    profile.lineTo(4.4, 0);
    profile.lineTo(0, 3.2);
    profile.closePath();
    return new ExtrudeGeometry(profile, { depth: 11, bevelEnabled: false });
  }, []);
  return (
    <group position={[27, 0, -9]} rotation={[0, (70 * Math.PI) / 180, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={[1.7, 1.3, 1]}>
        <circleGeometry args={[7, 32]} />
        <meshBasicMaterial
          map={shadowMap}
          color={SCENERY.shadow}
          transparent
          opacity={SCENERY.shadowStrength * 1.3}
          depthWrite={false}
        />
      </mesh>
      <Block kind="houseWall" size={[10, 6, 8]} position={[0, 3, 0]} />
      <mesh geometry={roof} position={[-5.5, 6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <SurfaceMaterial kind="houseRoof" />
        <Outline />
      </mesh>
      <Block kind="houseDark" size={[1.1, 2.1, 0.1]} position={[0, 1.05, 4.02]} />
      {[-3.2, 3.2].map((x) => (
        <Block key={x} kind="houseDark" size={[1.3, 1.3, 0.1]} position={[x, 1.6, 4.02]} />
      ))}
      {[-3.2, 0, 3.2].map((x) => (
        <Block key={x} kind="houseDark" size={[1.3, 1.3, 0.1]} position={[x, 4.4, 4.02]} />
      ))}
    </group>
  );
}

function Tree({ position, height }: { position: [number, number, number]; height: number }) {
  return (
    <group position={position}>
      <mesh position={[0, height * 0.12, 0]}>
        <cylinderGeometry args={[0.4, 0.5, height * 0.24, 8]} />
        <SurfaceMaterial kind="trunk" />
      </mesh>
      <mesh position={[0, height * 0.6, 0]}>
        <coneGeometry args={[height * 0.3, height * 0.78, 12]} />
        <SurfaceMaterial kind="tree" />
      </mesh>
    </group>
  );
}

/** Blends between colours spaced along 0 to 1. */
function ramp(colors: readonly string[]): (share: number) => Color {
  const stops = colors.map((color) => new Color(color));
  return (share) => {
    const place = Math.min(0.9999, Math.max(0, share)) * (stops.length - 1);
    const below = Math.floor(place);
    return (stops[below] as Color).clone().lerp(stops[below + 1] as Color, place - below);
  };
}

function paint(geometry: BufferGeometry, colorAt: (x: number, y: number, z: number) => Color) {
  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index++) {
    const color = colorAt(positions.getX(index), positions.getY(index), positions.getZ(index));
    colors.set([color.r, color.g, color.b], index * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/** The sky changes fastest near the horizon, which is the part a low view sees. */
function skyGeometry(sky: readonly string[]) {
  const at = ramp(sky);
  return paint(new SphereGeometry(WORLD_RADIUS, 48, 96), (_, y) =>
    at(Math.sqrt(Math.max(0, y) / WORLD_RADIUS) * 1.15),
  );
}

function groundGeometry(ground: readonly string[]) {
  const at = ramp(ground);
  const geometry = new RingGeometry(0.01, WORLD_RADIUS, 96, 32);
  geometry.rotateX(-Math.PI / 2);
  return paint(geometry, (x, _, z) => at(Math.sqrt(Math.hypot(x, z) / WORLD_RADIUS)));
}

/** One ring of rounded hills, its crest and foot in their own colours. */
function hillGeometry(
  radius: number,
  height: number,
  seed: number,
  [crest, foot]: readonly [string, string],
) {
  const segments = 240;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let step = 0; step <= segments; step++) {
    const angle = (step / segments) * 2 * Math.PI;
    const rise =
      0.55 +
      0.25 * Math.sin(angle * 5 + seed * 2.1) +
      0.14 * Math.sin(angle * 11 + seed * 4.3) +
      0.06 * Math.sin(angle * 23 + seed * 1.7);
    const [x, z] = [Math.sin(angle) * radius, Math.cos(angle) * radius];
    positions.push(x, 0, z, x, height * rise, z);
    if (step < segments) {
      const at = step * 2;
      indices.push(at, at + 1, at + 2, at + 1, at + 3, at + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  const [top, bottom] = [new Color(crest), new Color(foot)];
  return paint(geometry, (_, y) => bottom.clone().lerp(top, Math.min(1, y / (height * 0.45))));
}

let shadowTexture: CanvasTexture | undefined;

/** A soft round shadow, dark at the middle and gone at the edge. */
function softShadow(): CanvasTexture {
  if (shadowTexture === undefined) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context !== null) {
      const fade = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      fade.addColorStop(0, 'rgb(255 255 255 / 100%)');
      fade.addColorStop(0.4, 'rgb(255 255 255 / 62%)');
      fade.addColorStop(1, 'rgb(255 255 255 / 0%)');
      context.fillStyle = fade;
      context.fillRect(0, 0, 128, 128);
    }
    shadowTexture = new CanvasTexture(canvas);
  }
  return shadowTexture;
}
