import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { BarMagnet } from '../shared/BarMagnet';
import { Wire } from '../shared/circuitParts';
import { CentreZeroMeter, LedPair } from '../shared/indicators';
import { Block, Cylinder } from '../shared/surfaces';
import type { SceneProps } from '../types';
import {
  BOARD,
  COIL,
  CRANK_SPEEDS,
  LEDS,
  ledBrightness,
  MAGNET,
  MAGNET_Y,
  METER,
  WINDING,
  WIRES,
  type CrankGeneratorSnapshot,
} from './definition';

// The crank generator: an upright shaft held in a wooden frame, with a bar magnet across it and
// a crank on top, beside an iron-cored coil wired to the meter and LEDs. The shaft's angle, the
// needle and the LEDs come from the simulation each frame.

/** The bench top: wide enough that its edges stay out of the default view. */
const TABLETOP = { width: 2.4, depth: 1.6 };
const SHAFT = { radius: 0.003, top: MAGNET_Y + 0.05 };
const FRAME = { z: -0.03, size: 0.014, top: MAGNET_Y + 0.035 };
const CRANK = { arm: 0.035, handle: 0.025 };

export function CrankGeneratorScene({ getSnapshot, interactive, setControl }: SceneProps) {
  const rotor = useRef<Group>(null);
  // The engine pairs this scene only with its own model, so the snapshot is this model's.
  const snapshot = () => getSnapshot() as unknown as CrankGeneratorSnapshot;

  useFrame(() => {
    // The angle turns the magnet's N pole from +x toward -z: anticlockwise seen from above.
    if (rotor.current) rotor.current.rotation.y = snapshot().state.angle;
  });

  // Clicking the crank steps it through still, slow and fast, as the buttons do.
  const crankHandlers = {
    onClick(event: ThreeEvent<MouseEvent>) {
      if (!interactive) return;
      event.stopPropagation();
      const settings = Object.keys(CRANK_SPEEDS) as (keyof typeof CRANK_SPEEDS)[];
      const now = settings.indexOf(snapshot().controls.crank);
      setControl('crank', settings[(now + 1) % settings.length] ?? 'still');
    },
    onPointerOver() {
      if (interactive) document.body.style.cursor = 'pointer';
    },
    onPointerOut() {
      document.body.style.cursor = '';
    },
  };

  return (
    <group>
      <Block
        kind="tabletop"
        size={[TABLETOP.width, 0.02, TABLETOP.depth]}
        position={[0, -0.01, 0]}
      />
      <Block
        kind="board"
        size={[BOARD.width, BOARD.top, BOARD.depth]}
        position={[0, BOARD.top / 2, 0]}
      />

      {/* The frame: a post behind the shaft, with an arm over it carrying the top bearing. */}
      <Block
        kind="holder"
        size={[FRAME.size, FRAME.top - BOARD.top, FRAME.size]}
        position={[0, (FRAME.top + BOARD.top) / 2, FRAME.z]}
      />
      <Block
        kind="holder"
        size={[FRAME.size, 0.008, -FRAME.z + FRAME.size / 2]}
        position={[0, FRAME.top, FRAME.z / 2]}
      />
      <Cylinder kind="brass" radius={0.008} length={0.008} position={[0, BOARD.top + 0.004, 0]} />

      <group ref={rotor}>
        <Cylinder
          kind="metal"
          radius={SHAFT.radius}
          length={SHAFT.top - BOARD.top}
          position={[0, (SHAFT.top + BOARD.top) / 2, 0]}
        />
        <group position={[0, MAGNET_Y, 0]}>
          <BarMagnet length={MAGNET.length} side={MAGNET.side} reversed={false} />
        </group>
        <group position={[0, SHAFT.top, 0]} {...crankHandlers}>
          <Block kind="metal" size={[CRANK.arm, 0.004, 0.008]} position={[CRANK.arm / 2, 0, 0]} />
          <Cylinder
            kind="ink"
            radius={0.004}
            length={CRANK.handle}
            position={[CRANK.arm, CRANK.handle / 2, 0]}
          />
        </group>
      </group>

      {/* The coil on a saddle, its soft-iron core showing at both ends. */}
      <Block
        kind="holder"
        size={[COIL.length * 0.7, MAGNET_Y - COIL.radius - BOARD.top, 0.04]}
        position={[COIL.center.x, (MAGNET_Y - COIL.radius + BOARD.top) / 2, 0]}
      />
      <Cylinder
        kind="holder"
        radius={COIL.radius - 0.001}
        length={COIL.length + 0.003}
        position={[COIL.center.x, MAGNET_Y, 0]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <Cylinder
        kind="iron"
        radius={0.006}
        length={COIL.length + 0.006}
        position={[COIL.center.x, MAGNET_Y, 0]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <Wire points={WINDING} kind="copper" />

      <group position={[METER.x, BOARD.top, METER.z]}>
        <CentreZeroMeter getAngle={() => snapshot().state.needle.angle} />
      </group>
      <group position={[LEDS.x, BOARD.top, LEDS.z]}>
        <LedPair getBrightness={() => ledBrightness(snapshot().state)} />
      </group>
      <Wire points={WIRES.toMeter} kind="wireRed" />
      <Wire points={WIRES.fromMeter} kind="wireBlack" />
      <Wire points={WIRES.toLeds} kind="wireRed" />
      <Wire points={WIRES.fromLeds} kind="wireBlack" />
    </group>
  );
}
