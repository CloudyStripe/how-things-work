import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { Battery, KnifeSwitch, Wire } from '../shared/circuitParts';
import { Compass } from '../shared/Compass';
import { PaperClip } from '../shared/PaperClip';
import { Block, Cylinder } from '../shared/surfaces';
import type { SceneProps } from '../types';
import {
  AXIS_Y,
  BATTERY,
  BOARD,
  CLIP,
  COIL,
  COMPASS,
  CORE,
  CORE_OUT_Z,
  SWITCH,
  TRAY,
  WINDING,
  WINDING_DEPTH,
  WIRES,
  type CoilTraySnapshot,
} from './definition';

// The coil and clip tray: a copper coil held over a shallow tray of paper clips by an arm from a
// post behind it, the iron core lying in front (or pushed into the coil), a compass
// beyond the coil's right-hand end, and the battery and switch. Every clip's place, the core's
// and the compass needle's come from the simulation each frame.

const POST = { z: -0.055, size: 0.014 };

export function CoilTrayScene({ getSnapshot, interactive, setControl }: SceneProps) {
  const core = useRef<Group>(null);
  const clips = useRef<(Group | null)[]>([]);
  // The engine pairs this scene only with its own model, so the snapshot is this model's.
  const snapshot = () => getSnapshot() as unknown as CoilTraySnapshot;
  const clipCount = snapshot().state.clips.length;

  useFrame(() => {
    const { state, controls } = snapshot();
    if (core.current) {
      core.current.position.set(
        0,
        controls.core ? AXIS_Y : BOARD.top + CORE.radius,
        controls.core ? 0 : CORE_OUT_Z,
      );
    }
    state.clips.forEach((clip, index) => {
      const group = clips.current[index];
      if (!group) return;
      group.position.set(clip.position.x, clip.position.y, clip.position.z);
      group.rotation.y = -clip.angle;
    });
  });

  const coreHandlers = {
    onClick(event: ThreeEvent<MouseEvent>) {
      if (!interactive) return;
      event.stopPropagation();
      setControl('core', !snapshot().controls.core);
    },
    onPointerOver() {
      if (interactive) document.body.style.cursor = 'pointer';
    },
    onPointerOut() {
      document.body.style.cursor = '';
    },
  };

  const outer = COIL.radius + WINDING_DEPTH;
  const armY = AXIS_Y + outer + 0.004;
  return (
    <group>
      <Block
        kind="woodBoard"
        size={[BOARD.width, BOARD.top, BOARD.depth]}
        position={[0, BOARD.top / 2, 0]}
      />
      <Tray />

      {/* The holder: a post behind the tray and an arm out over it to the coil's middle. */}
      <Block
        kind="structure"
        size={[POST.size, armY - BOARD.top + 0.004, POST.size]}
        position={[0, (armY + BOARD.top + 0.004) / 2, POST.z]}
      />
      <Block kind="structure" size={[POST.size, 0.008, -POST.z]} position={[0, armY, POST.z / 2]} />

      {/* The coil: a former under the winding, and the winding drawn as a copper helix. */}
      <Cylinder
        kind="structure"
        radius={COIL.radius - 0.0008}
        length={COIL.length}
        position={[0, AXIS_Y, 0]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <Wire points={WINDING} kind="copper" />

      <group ref={core} {...coreHandlers}>
        <Cylinder
          kind="iron"
          radius={CORE.radius}
          length={CORE.length}
          rotation={[0, 0, Math.PI / 2]}
        />
      </group>

      {Array.from({ length: clipCount }, (_, index) => (
        <group
          key={index}
          ref={(group) => {
            clips.current[index] = group;
          }}
        >
          {/* Turned a quarter turn, so its length runs along z at bearing 0. */}
          <group rotation-y={Math.PI / 2}>
            <PaperClip length={CLIP.length} width={CLIP.width} wire={CLIP.thickness / 2} />
          </group>
        </group>
      ))}

      <group position={[BATTERY.x, BOARD.top, BATTERY.z]}>
        <Battery length={BATTERY.cellLength} radius={BATTERY.cellRadius} cells={BATTERY.cells} />
      </group>
      <group position={[COMPASS.x, BOARD.top, COMPASS.z]}>
        <Compass
          radius={COMPASS.radius}
          needleHeight={COMPASS.needleHeight}
          getAngle={() => snapshot().state.needle.angle}
        />
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
      <Wire points={WIRES.toCoil} kind="wire" />
      <Wire points={WIRES.back} kind="wireReturn" />
    </group>
  );
}

/** A shallow tray: a floor and four low walls. */
function Tray() {
  const { halfWidth, halfDepth, wall, floor } = TRAY;
  const height = 0.008;
  const y = floor + height / 2;
  return (
    <group>
      <Block
        kind="structure"
        size={[2 * halfWidth + 2 * wall, floor - BOARD.top, 2 * halfDepth + 2 * wall]}
        position={[0, (floor + BOARD.top) / 2, 0]}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            kind="structure"
            size={[2 * halfWidth + 2 * wall, height, wall]}
            position={[0, y, side * (halfDepth + wall / 2)]}
          />
          <Block
            kind="structure"
            size={[wall, height, 2 * halfDepth]}
            position={[side * (halfWidth + wall / 2), y, 0]}
          />
        </group>
      ))}
    </group>
  );
}
