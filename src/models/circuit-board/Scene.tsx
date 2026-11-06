import { Battery, Bulb, KnifeSwitch, Wire } from '../shared/circuitParts';
import { Block } from '../shared/surfaces';
import type { SceneProps } from '../types';
import { BATTERY, BOARD, BULB, SWITCH, WIRES, type CircuitBoardSnapshot } from './definition';

// The circuit board: a wooden board with the battery on the left, the knife switch at the
// front and the bulb on the right, joined by coated wires. The switch's blade and the bulb's glow
// follow the simulation every frame.

export function CircuitBoardScene({ getSnapshot, interactive, setControl }: SceneProps) {
  // The engine pairs this scene only with its own model, so the snapshot is this model's.
  const snapshot = () => getSnapshot() as unknown as CircuitBoardSnapshot;

  return (
    <group>
      <Block
        kind="woodBoard"
        size={[BOARD.width, BOARD.top, BOARD.depth]}
        position={[0, BOARD.top / 2, 0]}
      />
      <group position={[BATTERY.x, BOARD.top, 0]}>
        <Battery length={BATTERY.cellLength} radius={BATTERY.cellRadius} cells={BATTERY.cells} />
      </group>
      <group position={[SWITCH.x, BOARD.top, SWITCH.z]}>
        <KnifeSwitch
          span={SWITCH.span}
          isClosed={() => snapshot().controls.switch}
          interactive={interactive}
          onToggle={() => setControl('switch', !snapshot().controls.switch)}
        />
      </group>
      <group position={[BULB.x, BOARD.top, 0]}>
        <Bulb getGlow={() => snapshot().state.glow} />
      </group>
      <Wire points={WIRES.toSwitch} kind="wire" />
      <Wire points={WIRES.toBulb} kind="wire" />
      <Wire points={WIRES.back} kind="wireReturn" />
    </group>
  );
}
