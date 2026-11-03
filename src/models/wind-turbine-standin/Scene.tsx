import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group, MeshStandardMaterial } from 'three';
import type { ExplorerView, SceneProps } from '../types';
import { HUB_HEIGHT, type TurbineState } from './definition';

// Plain blocks standing in for a real turbine (Phase 7 builds that). Each part moves out along
// its own direction as the exploded view opens, hides once removed, and lights up when
// selected. The rotor's angle comes from the simulation every frame.

const BLADE_LENGTH = 38;

/** How far (m) and which way each part moves at the fully exploded view. */
const EXPLODE: Readonly<Record<string, readonly [number, number, number]>> = {
  blades: [0, 0, 18],
  hub: [0, 0, 11],
  nacelleCover: [0, 10, 0],
  mainShaft: [0, 0, 5],
  gearbox: [0, 3, 0],
  generator: [0, 0, -8],
  tower: [0, 0, 0],
};

const COLORS = {
  ground: '#cfd5c8',
  part: '#d7d9db',
  inner: '#a9adb1',
  selected: '#e2b44a',
};

export function WindTurbineStandinScene({
  getSnapshot,
  getView,
  interactive,
  selectPart,
}: SceneProps) {
  const rotor = useRef<Group>(null);

  useFrame(() => {
    const state = getSnapshot().state as TurbineState;
    // Seen from the front (from +z), the rotor turns clockwise.
    if (rotor.current) rotor.current.rotation.z = -state.angle;
  });

  const part = (id: string, children: ReactNode) => (
    <Part id={id} getView={getView} interactive={interactive} selectPart={selectPart}>
      {children}
    </Part>
  );

  return (
    <group>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[160, 160, 1, 48]} />
        <meshStandardMaterial color={COLORS.ground} />
      </mesh>

      {part(
        'tower',
        <mesh position={[0, HUB_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[1.6, 2.6, HUB_HEIGHT, 24]} />
          <PartMaterial id="tower" getView={getView} />
        </mesh>,
      )}

      <group position={[0, HUB_HEIGHT, 0]}>
        {part(
          'nacelleCover',
          <mesh position={[0, 0.4, -3]}>
            <boxGeometry args={[4.4, 4.4, 12]} />
            <PartMaterial id="nacelleCover" getView={getView} />
          </mesh>,
        )}
        {part(
          'gearbox',
          <mesh position={[0, 0, -2.5]}>
            <boxGeometry args={[2.6, 2.6, 3]} />
            <PartMaterial id="gearbox" getView={getView} inner />
          </mesh>,
        )}
        {part(
          'generator',
          <mesh position={[0, 0, -6.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.4, 1.4, 3.4, 24]} />
            <PartMaterial id="generator" getView={getView} inner />
          </mesh>,
        )}

        <group ref={rotor} position={[0, 0, 0]}>
          {part(
            'mainShaft',
            <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.45, 0.45, 3.6, 16]} />
              <PartMaterial id="mainShaft" getView={getView} inner />
            </mesh>,
          )}
          {part(
            'hub',
            <mesh position={[0, 0, 3.6]}>
              <sphereGeometry args={[1.8, 24, 16]} />
              <PartMaterial id="hub" getView={getView} />
            </mesh>,
          )}
          {part(
            'blades',
            <group position={[0, 0, 3.6]}>
              {[0, 1, 2].map((index) => (
                <group key={index} rotation={[0, 0, (index * 2 * Math.PI) / 3]}>
                  <mesh position={[0, 1.6 + BLADE_LENGTH / 2, 0]}>
                    <boxGeometry args={[2.2, BLADE_LENGTH, 0.5]} />
                    <PartMaterial id="blades" getView={getView} />
                  </mesh>
                </group>
              ))}
            </group>,
          )}
        </group>
      </group>
    </group>
  );
}

/**
 * One part: moved out by the exploded view, hidden once removed, and clickable while the lesson
 * is interactive.
 */
function Part({
  id,
  getView,
  interactive,
  selectPart,
  children,
}: {
  id: string;
  getView: () => ExplorerView;
  interactive: boolean;
  selectPart(partId: string): void;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const [x, y, z] = EXPLODE[id] ?? [0, 0, 0];

  useFrame(() => {
    if (!group.current) return;
    const view = getView();
    group.current.visible = !view.removedParts.includes(id);
    group.current.position.set(x * view.explode, y * view.explode, z * view.explode);
  });

  return (
    <group
      ref={group}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (!interactive) return;
        event.stopPropagation();
        selectPart(id);
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        if (!interactive) return;
        event.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {children}
    </group>
  );
}

/** Grey, a darker grey for the machinery inside, and gold while the part is selected. */
function PartMaterial({
  id,
  getView,
  inner = false,
}: {
  id: string;
  getView: () => ExplorerView;
  inner?: boolean;
}) {
  const material = useRef<MeshStandardMaterial>(null);
  const base = inner ? COLORS.inner : COLORS.part;

  useFrame(() => {
    material.current?.color.set(getView().selectedPart === id ? COLORS.selected : base);
  });

  return <meshStandardMaterial ref={material} color={base} />;
}
