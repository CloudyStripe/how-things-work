import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { BarMagnet } from '../shared/BarMagnet';
import { Block, Cylinder } from '../shared/surfaces';
import { useBenchDrag } from '../shared/useBenchDrag';
import type { SceneProps } from '../types';
import { HOLDER_TRAVEL, MAGNET_HEIGHT, RAIL_END, type MagnetRailState } from './definition';

// A wooden rail on a bench top, painted bar magnets (red N, blue S), wooden carts on rubber
// wheels. Every position comes from the simulation each frame; nothing here moves on its own.

const MAGNET = { length: 0.06, side: 0.015 };
const RAIL = { height: 0.012, width: 0.04, halfLength: RAIL_END + 0.05 };
const CART = { length: 0.07, width: 0.032, height: 0.0065 };
const WHEEL_RADIUS = 0.005;
/** The bench top: wide enough that its edges stay out of the default view. */
const TABLETOP = { width: 2.4, depth: 1.6 };

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

  const drag = useBenchDrag({
    enabled: interactive,
    height: MAGNET_HEIGHT,
    current: () => ({ x: state().holder, z: 0 }),
    onDrag(x) {
      const value = (x - HOLDER_TRAVEL.min) / (HOLDER_TRAVEL.max - HOLDER_TRAVEL.min);
      setControl('position', Math.min(1, Math.max(0, value)));
    },
  });

  const holderHeight = MAGNET_HEIGHT - MAGNET.side / 2 - RAIL.height;

  return (
    <group>
      <Block
        kind="tabletop"
        size={[TABLETOP.width, 0.02, TABLETOP.depth]}
        position={[0, -0.01, 0]}
      />
      <Block
        kind="rail"
        size={[2 * RAIL.halfLength, RAIL.height, RAIL.width]}
        position={[0, RAIL.height / 2, 0]}
      />
      {[-1, 1].map((side) => (
        <Block
          key={side}
          kind="endStop"
          size={[0.015, 0.02, RAIL.width]}
          position={[side * (RAIL_END + CART.length / 2 + 0.0075), RAIL.height + 0.01, 0]}
        />
      ))}

      <group ref={holder} {...drag}>
        <Block
          kind="holder"
          size={[CART.length, holderHeight, CART.width]}
          position={[0, RAIL.height + holderHeight / 2, 0]}
        />
        <RailMagnet reversed={false} />
      </group>

      <group ref={leftCart}>
        <Cart bumperSide={1} />
        <RailMagnet reversed={false} />
      </group>
      <group ref={rightCart}>
        <Cart bumperSide={-1} />
        <RailMagnet reversed />
      </group>
    </group>
  );
}

/** A bar magnet lying along the rail at the magnets' height. */
function RailMagnet({ reversed }: { reversed: boolean }) {
  return (
    <group position={[0, MAGNET_HEIGHT, 0]}>
      <BarMagnet length={MAGNET.length} side={MAGNET.side} reversed={reversed} />
    </group>
  );
}

/** A wooden cart on four wheels, with a rubber bumper on the end facing the middle. */
function Cart({ bumperSide }: { bumperSide: 1 | -1 }) {
  const wheelY = RAIL.height + WHEEL_RADIUS;
  const bodyY = wheelY + CART.height / 2;
  return (
    <group>
      <Block kind="cart" size={[CART.length, CART.height, CART.width]} position={[0, bodyY, 0]} />
      {[-1, 1].flatMap((along) =>
        [-1, 1].map((across) => (
          <Cylinder
            key={`${along}${across}`}
            kind="rubber"
            radius={WHEEL_RADIUS}
            length={0.004}
            position={[(along * CART.length) / 3, wheelY, (across * CART.width) / 2]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <Cylinder kind="metal" radius={WHEEL_RADIUS * 0.4} length={0.0046} />
          </Cylinder>
        )),
      )}
      <Cylinder
        kind="rubber"
        radius={0.004}
        length={0.005}
        position={[bumperSide * (MAGNET.length / 2 + 0.0025), MAGNET_HEIGHT, 0]}
        rotation={[0, 0, Math.PI / 2]}
      />
    </group>
  );
}
