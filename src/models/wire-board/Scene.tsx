import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { Battery, KnifeSwitch, Wire } from '../shared/circuitParts';
import { Compass } from '../shared/Compass';
import { Block } from '../shared/surfaces';
import type { SceneProps } from '../types';
import {
  BATTERY,
  BOARD,
  COMPASS,
  COMPASSES,
  SWITCH,
  WIRES,
  type WireBoardSnapshot,
} from './definition';

// The wire board: a board on four legs with a tall bare copper wire rising through its centre,
// sixteen plotting compasses round it, and the cell and switch at the back. The leads run over
// the board's right edge and under it, and from the top of the wire down beyond its left edge.

const LEG = 0.02;

export function WireBoardScene({ getSnapshot, interactive, setControl }: SceneProps) {
  const battery = useRef<Group>(null);
  // The engine pairs this scene only with its own model, so the snapshot is this model's.
  const snapshot = () => getSnapshot() as unknown as WireBoardSnapshot;

  useFrame(() => {
    // Turned round, the cell's + end faces left.
    if (battery.current) battery.current.rotation.y = snapshot().controls.battery ? Math.PI : 0;
  });

  const legHeight = BOARD.top - BOARD.thickness;
  return (
    <group>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Block
            key={`${sx}${sz}`}
            kind="structure"
            size={[LEG, legHeight, LEG]}
            position={[sx * (BOARD.width / 2 - LEG), legHeight / 2, sz * (BOARD.depth / 2 - LEG)]}
          />
        )),
      )}
      <Block
        kind="woodBoard"
        size={[BOARD.width, BOARD.thickness, BOARD.depth]}
        position={[0, BOARD.top - BOARD.thickness / 2, 0]}
      />

      <group ref={battery} position={[BATTERY.x, BOARD.top, BATTERY.z]}>
        <Battery length={BATTERY.cellLength} radius={BATTERY.cellRadius} cells={1} />
      </group>
      <group position={[SWITCH.x, BOARD.top, SWITCH.z]}>
        <KnifeSwitch
          span={SWITCH.span}
          isClosed={() => snapshot().controls.switch}
          interactive={interactive}
          onToggle={() => setControl('switch', !snapshot().controls.switch)}
        />
      </group>
      <Wire points={WIRES.toSwitch} kind="wire" />
      <Wire points={WIRES.under} kind="wire" />
      <Wire points={WIRES.tall} kind="copper" />
      <Wire points={WIRES.back} kind="wireReturn" />

      {COMPASSES.map((at, index) => (
        <group key={index} position={[at.x, BOARD.top, at.z]}>
          <Compass
            radius={COMPASS.radius}
            needleHeight={COMPASS.needleHeight}
            getAngle={() => snapshot().state.needles[index]?.angle ?? 0}
          />
        </group>
      ))}
    </group>
  );
}
