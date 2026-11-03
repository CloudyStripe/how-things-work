import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Texture } from 'three';
import { useLetterTexture } from '../shared/labelTexture';
import { useRenderStyle } from '../shared/renderStyle';
import { Block, Cylinder, SurfaceMaterial } from '../shared/surfaces';
import { useRailDrag } from '../shared/useRailDrag';
import type { SceneProps } from '../types';
import { HOLDER_TRAVEL, MAGNET_HEIGHT, RAIL_END, type MagnetRailState } from './definition';

// A wooden rail on a bench top, painted bar magnets (red N, blue S), wooden carts on rubber
// wheels. Every position comes from the simulation each frame; nothing here moves on its own.
// How each surface looks comes from the shared surfaces, in the current style.

const MAGNET = { length: 0.06, side: 0.015 };
const RAIL = { height: 0.012, width: 0.04, halfLength: RAIL_END + 0.05 };
const CART = { length: 0.07, width: 0.032, height: 0.0065 };
const WHEEL_RADIUS = 0.005;
/** The tabletop in the photorealistic style: wide enough that its edges fade into the fog. */
const TABLETOP = { width: 8, depth: 6 };

export function MagnetRailScene({ getSnapshot, interactive, setControl }: SceneProps) {
  const holder = useRef<Group>(null);
  const leftCart = useRef<Group>(null);
  const rightCart = useRef<Group>(null);
  const style = useRenderStyle((current) => current.style);
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

  const holderHeight = MAGNET_HEIGHT - MAGNET.side / 2 - RAIL.height;

  return (
    <group>
      {style === 'photoreal' ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[TABLETOP.width, TABLETOP.depth]} />
          <SurfaceMaterial kind="tabletop" />
        </mesh>
      ) : (
        <Block kind="tabletop" size={[0.8, 0.02, 0.4]} position={[0, -0.01, 0]} />
      )}
      <Block
        kind="rail"
        size={[2 * RAIL.halfLength, RAIL.height, RAIL.width]}
        position={[0, RAIL.height / 2, 0]}
        radius={0.002}
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
  const north = useLetterTexture('N', null, '#ffffff');
  const south = useLetterTexture('S', null, '#ffffff');
  const half = MAGNET.length / 2;
  const northX = reversed ? -half / 2 : half / 2;

  return (
    <group position={[0, MAGNET_HEIGHT, 0]}>
      {[
        { x: northX, kind: 'magnetNorth' as const, letter: north },
        { x: -northX, kind: 'magnetSouth' as const, letter: south },
      ].map(({ x, kind, letter }) => (
        <group key={kind} position={[x, 0, 0]}>
          <Block kind={kind} size={[half, MAGNET.side, MAGNET.side]} radius={0.0008} />
          <MagnetLetter texture={letter} />
        </group>
      ))}
    </group>
  );
}

/** A white letter printed on a magnet's top face. */
function MagnetLetter({ texture }: { texture: Texture }) {
  const style = useRenderStyle((current) => current.style);
  return (
    <mesh position={[0, MAGNET.side / 2 + 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[MAGNET.side * 0.8, MAGNET.side * 0.8]} />
      {style === 'photoreal' ? (
        <meshStandardMaterial map={texture} transparent roughness={0.4} />
      ) : (
        <meshBasicMaterial map={texture} transparent />
      )}
    </mesh>
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
