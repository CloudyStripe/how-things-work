import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { useLetterTexture } from '../shared/labelTexture';
import { useRailDrag } from '../shared/useRailDrag';
import type { SceneProps } from '../types';
import { HOLDER_TRAVEL, MAGNET_HEIGHT, RAIL_END, type MagnetRailState } from './definition';

// Plain materials until the style decision at the start of Phase 4: a wooden bench and rail,
// painted bar magnets (red N, blue S), wooden carts. Every position comes from the simulation
// each frame; nothing here moves on its own.

const MAGNET = { length: 0.06, side: 0.015 };
const RAIL = { height: 0.012, width: 0.04, halfLength: RAIL_END + 0.05 };
const CART = { length: 0.07, width: 0.032, height: 0.0065 };
const WHEEL_RADIUS = 0.005;

const COLORS = {
  bench: '#d9c7a7',
  rail: '#b08a5a',
  cart: '#c9a26b',
  holder: '#9c7347',
  north: '#c0392b',
  south: '#2e5fa8',
  rubber: '#2b2b2b',
  wheel: '#3a3a3a',
};

export function MagnetRailScene({ getSnapshot, interactive, setControl }: SceneProps) {
  const holder = useRef<Group>(null);
  const leftCart = useRef<Group>(null);
  const rightCart = useRef<Group>(null);
  // The engine pairs this scene only with its own model, so the state is this model's.
  const state = () => getSnapshot().state as MagnetRailState;

  useFrame(() => {
    const { holder: x, leftCart: left, rightCart: right } = state();
    holder.current?.position.setX(x);
    leftCart.current?.position.setX(left.position.x);
    rightCart.current?.position.setX(right.position.x);
  });

  const drag = useRailDrag({
    enabled: interactive,
    height: MAGNET_HEIGHT,
    currentX: () => state().holder,
    onDrag(x) {
      const value = (x - HOLDER_TRAVEL.min) / (HOLDER_TRAVEL.max - HOLDER_TRAVEL.min);
      setControl('position', Math.min(1, Math.max(0, value)));
    },
  });

  return (
    <group>
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[0.8, 0.02, 0.4]} />
        <meshStandardMaterial color={COLORS.bench} />
      </mesh>
      <mesh position={[0, RAIL.height / 2, 0]}>
        <boxGeometry args={[2 * RAIL.halfLength, RAIL.height, RAIL.width]} />
        <meshStandardMaterial color={COLORS.rail} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (RAIL_END + CART.length / 2 + 0.0075), 0.022, 0]}>
          <boxGeometry args={[0.015, 0.02, RAIL.width]} />
          <meshStandardMaterial color={COLORS.holder} />
        </mesh>
      ))}

      <group ref={holder} {...drag}>
        <mesh position={[0, (RAIL.height + MAGNET_HEIGHT - MAGNET.side / 2) / 2, 0]}>
          <boxGeometry
            args={[CART.length, MAGNET_HEIGHT - MAGNET.side / 2 - RAIL.height, CART.width]}
          />
          <meshStandardMaterial color={COLORS.holder} />
        </mesh>
        <BarMagnet reversed={false} />
      </group>

      <group ref={leftCart}>
        <Cart bumperSide={1} />
        <BarMagnet reversed={false} />
      </group>
      <group ref={rightCart}>
        <Cart bumperSide={-1} />
        <BarMagnet reversed />
      </group>
    </group>
  );
}

/** A painted bar magnet lying along the rail: N half red, S half blue, with letters on top. */
function BarMagnet({ reversed }: { reversed: boolean }) {
  const north = useLetterTexture('N', COLORS.north, '#ffffff');
  const south = useLetterTexture('S', COLORS.south, '#ffffff');
  const half = MAGNET.length / 2;
  const northX = reversed ? -half / 2 : half / 2;

  return (
    <group position={[0, MAGNET_HEIGHT, 0]}>
      {[
        { x: northX, color: COLORS.north, letter: north },
        { x: -northX, color: COLORS.south, letter: south },
      ].map(({ x, color, letter }) => (
        <group key={color} position={[x, 0, 0]}>
          <mesh>
            <boxGeometry args={[half, MAGNET.side, MAGNET.side]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, MAGNET.side / 2 + 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[MAGNET.side * 0.9, MAGNET.side * 0.9]} />
            <meshStandardMaterial map={letter} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A wooden cart on four wheels, with a rubber bumper on the end facing the middle. */
function Cart({ bumperSide }: { bumperSide: 1 | -1 }) {
  const wheelY = RAIL.height + WHEEL_RADIUS;
  const bodyY = wheelY + CART.height / 2;
  return (
    <group>
      <mesh position={[0, bodyY, 0]}>
        <boxGeometry args={[CART.length, CART.height, CART.width]} />
        <meshStandardMaterial color={COLORS.cart} />
      </mesh>
      {[-1, 1].flatMap((along) =>
        [-1, 1].map((across) => (
          <mesh
            key={`${along}${across}`}
            position={[(along * CART.length) / 3, wheelY, (across * CART.width) / 2]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.004, 16]} />
            <meshStandardMaterial color={COLORS.wheel} />
          </mesh>
        )),
      )}
      <mesh
        position={[bumperSide * (MAGNET.length / 2 + 0.0025), MAGNET_HEIGHT, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.004, 0.004, 0.005, 16]} />
        <meshStandardMaterial color={COLORS.rubber} />
      </mesh>
    </group>
  );
}
