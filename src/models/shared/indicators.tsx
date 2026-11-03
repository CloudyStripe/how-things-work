import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, MeshBasicMaterial, type Group } from 'three';
import { Block, Cylinder } from './surfaces';

// The induction lessons' indicators: a centre-zero meter with no scale, and two LEDs wired
// opposite ways. Each is drawn centred on its group, standing on the bench and facing the
// learner (+z); the needle's angle and each LED's brightness are read from the simulation every
// frame.

const METER = { width: 0.075, height: 0.065, depth: 0.03, needle: 0.042 };

/** A centre-zero meter: a needle pivoted at the bottom of a plain card face, under glass. */
export function CentreZeroMeter({ getAngle }: { getAngle: () => number }) {
  const needle = useRef<Group>(null);
  const faceZ = METER.depth / 2 + 0.0006;
  const pivotY = METER.height * 0.22;

  useFrame(() => {
    // A positive angle swings the needle to the right, clockwise as the learner sees it.
    if (needle.current) needle.current.rotation.z = -getAngle();
  });

  return (
    <group>
      <Block
        kind="ink"
        size={[METER.width, METER.height, METER.depth]}
        position={[0, METER.height / 2, 0]}
      />
      <mesh position={[0, METER.height * 0.58, faceZ]}>
        <planeGeometry args={[METER.width * 0.84, METER.height * 0.68]} />
        <meshBasicMaterial color="#f8f6ef" />
      </mesh>
      {/* Only a mark at the centre: no scale and no numbers. */}
      <Block
        kind="ink"
        size={[0.0012, 0.006, 0.0004]}
        position={[0, pivotY + METER.needle + 0.002, faceZ + 0.0002]}
      />
      <group ref={needle} position={[0, pivotY, faceZ + 0.0008]}>
        <Block
          kind="magnetNorth"
          size={[0.0014, METER.needle, 0.0006]}
          position={[0, METER.needle / 2, 0]}
        />
        <Cylinder kind="ink" radius={0.003} length={0.002} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}

const LED_COLORS = {
  red: { dark: '#7a2620', lit: '#ff5040' },
  green: { dark: '#245a31', lit: '#5dff7a' },
} as const;

/** A small board with a red LED and a green one, wired opposite ways. */
export function LedPair({
  getBrightness,
}: {
  getBrightness: () => { red: number; green: number };
}) {
  return (
    <group>
      <Block kind="holder" size={[0.05, 0.006, 0.024]} position={[0, 0.003, 0]} />
      <Led color="red" x={-0.012} getBrightness={() => getBrightness().red} />
      <Led color="green" x={0.012} getBrightness={() => getBrightness().green} />
    </group>
  );
}

function Led({
  color,
  x,
  getBrightness,
}: {
  color: keyof typeof LED_COLORS;
  x: number;
  getBrightness: () => number;
}) {
  const halo = useRef<MeshBasicMaterial>(null);
  const colors = useMemo(
    () => ({ dark: new Color(LED_COLORS[color].dark), lit: new Color(LED_COLORS[color].lit) }),
    [color],
  );
  // One material for the body and the dome, so the whole LED lights together.
  const body = useMemo(() => new MeshBasicMaterial({ color: colors.dark }), [colors]);
  const radius = 0.0028;
  const bodyHeight = 0.006;

  useFrame(() => {
    const brightness = Math.min(1, Math.max(0, getBrightness()));
    body.color.copy(colors.dark).lerp(colors.lit, brightness);
    if (halo.current) halo.current.opacity = 0.45 * brightness;
  });

  return (
    <group position={[x, 0.006, 0]}>
      <mesh position={[0, bodyHeight / 2, 0]} material={body}>
        <cylinderGeometry args={[radius, radius, bodyHeight, 20]} />
      </mesh>
      <mesh position={[0, bodyHeight, 0]} material={body}>
        <sphereGeometry args={[radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, bodyHeight, 0]}>
        <sphereGeometry args={[radius * 3, 20, 14]} />
        <meshBasicMaterial
          ref={halo}
          color={LED_COLORS[color].lit}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
