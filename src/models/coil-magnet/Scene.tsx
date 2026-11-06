import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { BarMagnet } from '../shared/BarMagnet';
import { Wire } from '../shared/circuitParts';
import { CentreZeroMeter, LedPair } from '../shared/indicators';
import { Block, Cylinder } from '../shared/surfaces';
import { useBenchDrag } from '../shared/useBenchDrag';
import type { SceneProps } from '../types';
import {
  AXIS_Y,
  BOARD,
  COIL,
  LEDS,
  ledBrightness,
  MAGNET,
  MAGNET_TRAVEL,
  METER,
  WINDING,
  WIRES,
  type CoilMagnetSnapshot,
} from './definition';

// The coil and magnet: a coil on two wooden saddles, a strong bar magnet on a wooden pusher that
// slides along a rail into it, and the meter and LEDs wired to the coil. The magnet's place, the
// needle and the LEDs come from the simulation each frame.

const RAIL = { width: 0.016, end: COIL.center.x - COIL.length / 2 - 0.004 };
const PUSHER = { length: 0.12, radius: 0.004 };

export function CoilMagnetScene({ getSnapshot, interactive, setControl }: SceneProps) {
  const magnet = useRef<Group>(null);
  // The engine pairs this scene only with its own model, so the snapshot is this model's.
  const snapshot = () => getSnapshot() as unknown as CoilMagnetSnapshot;

  useFrame(() => {
    magnet.current?.position.setX(snapshot().state.magnet);
  });

  const drag = useBenchDrag({
    enabled: interactive,
    height: AXIS_Y,
    current: () => ({ x: snapshot().state.magnet, z: 0 }),
    onDrag(x) {
      const value = (x - MAGNET_TRAVEL.min) / (MAGNET_TRAVEL.max - MAGNET_TRAVEL.min);
      setControl('position', Math.min(1, Math.max(0, value)));
    },
  });

  const railTop = AXIS_Y - MAGNET.side / 2;
  const railStart = MAGNET_TRAVEL.min - MAGNET.length / 2 - PUSHER.length - 0.01;
  return (
    <group>
      <Block
        kind="woodBoard"
        size={[BOARD.width, BOARD.top, BOARD.depth]}
        position={[0, BOARD.top / 2, 0]}
      />
      {/* The rail the magnet slides on, up to the coil's mouth. */}
      <Block
        kind="wood"
        size={[RAIL.end - railStart, railTop - BOARD.top, RAIL.width]}
        position={[(RAIL.end + railStart) / 2, (railTop + BOARD.top) / 2, 0]}
      />

      {/* The coil: a former on two saddles, and the winding drawn as a copper helix. */}
      {[-1, 1].map((side) => (
        <Block
          key={side}
          kind="wood"
          size={[0.012, AXIS_Y - COIL.radius - BOARD.top, 0.05]}
          position={[
            COIL.center.x + (side * COIL.length) / 3,
            (AXIS_Y - COIL.radius + BOARD.top) / 2,
            0,
          ]}
        />
      ))}
      <Cylinder
        kind="structure"
        radius={COIL.radius - 0.001}
        length={COIL.length + 0.004}
        position={[COIL.center.x, AXIS_Y, 0]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <Wire points={WINDING} kind="copper" />

      <group ref={magnet} position={[0, AXIS_Y, 0]} {...drag}>
        <BarMagnet length={MAGNET.length} side={MAGNET.side} reversed={false} />
        {/* The wooden pusher the learner holds, on the magnet's S end. */}
        <Cylinder
          kind="wood"
          radius={PUSHER.radius}
          length={PUSHER.length}
          position={[-(MAGNET.length + PUSHER.length) / 2, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
        />
      </group>

      <group position={[METER.x, BOARD.top, METER.z]}>
        <CentreZeroMeter getAngle={() => snapshot().state.needle.angle} />
      </group>
      <group position={[LEDS.x, BOARD.top, LEDS.z]}>
        <LedPair getBrightness={() => ledBrightness(snapshot().state)} />
      </group>
      <Wire points={WIRES.toMeter} kind="wire" />
      <Wire points={WIRES.fromMeter} kind="wireReturn" />
      <Wire points={WIRES.toLeds} kind="wire" />
      <Wire points={WIRES.fromLeds} kind="wireReturn" />
    </group>
  );
}
