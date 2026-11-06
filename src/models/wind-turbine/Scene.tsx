import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ExtrudeGeometry, Shape, type Group } from 'three';
import { Block, Cylinder, Outline, SurfaceMaterial, type SurfaceKind } from '../shared/surfaces';
import { PickedPart } from '../shared/pickedPart';
import type { ExplorerView, SceneProps } from '../types';
import { Backdrop } from './Backdrop';
import { bladeGeometry } from './blade';
import { coverSeeThrough, EXPLODE, HUB_HEIGHT, LAYOUT, type TurbineState } from './definition';

// The wind turbine: a tapered tower, a nacelle holding the drivetrain (main shaft and bearing,
// gearbox, brake and generator on a cast bedplate), and a hub with three twisted, tapered blades.
// Each part is coloured by what it does: what turns in one colour, the generator in another, what
// holds them up in a neutral. It moves out along its own direction as the exploded view opens, hides
// once removed, and takes a heavy outline when picked. The nacelle cover goes see-through while a
// part inside it is picked. The rotor's angle comes from the simulation every frame.

const { nacelle, hub, blades, mainShaft, gearbox, generator, tower } = LAYOUT;
const NACELLE_LENGTH = nacelle.front - nacelle.back;
const NACELLE_MIDDLE = (nacelle.front + nacelle.back) / 2;
const TOWER_HEIGHT = nacelle.bottom;
/** A quarter turn about x lays a cylinder along z, the rotor's axis. */
const ALONG_Z: [number, number, number] = [Math.PI / 2, 0, 0];

export function WindTurbineScene({ getSnapshot, getView, interactive, selectPart }: SceneProps) {
  const rotor = useRef<Group>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [seeThrough, setSeeThrough] = useState(false);

  useFrame(() => {
    const state = getSnapshot().state as TurbineState;
    // Seen from the front (from +z), the rotor turns clockwise.
    if (rotor.current) rotor.current.rotation.z = -state.angle;
    const view = getView();
    if (view.selectedPart !== selected) setSelected(view.selectedPart);
    if (coverSeeThrough(view) !== seeThrough) setSeeThrough(coverSeeThrough(view));
  });

  const coverPaint: SurfaceKind = seeThrough ? 'seeThroughPaint' : 'coverPaint';
  const part = (id: string, children: ReactNode) => (
    <PickedPart.Provider value={selected === id}>
      <Part id={id} getView={getView} interactive={interactive} selectPart={selectPart}>
        {children}
      </Part>
    </PickedPart.Provider>
  );

  return (
    <group>
      <Backdrop getSnapshot={getSnapshot} />

      {part(
        'tower',
        <>
          <TaperedTube
            kind="towerPaint"
            bottom={tower.baseRadius}
            top={tower.topRadius}
            height={TOWER_HEIGHT}
          />
          {/* Flanges where the tower's sections bolt together, and the door at its foot. */}
          {[0.33, 0.66].map((share) => (
            <Cylinder
              key={share}
              kind="towerPaint"
              radius={tower.baseRadius + (tower.topRadius - tower.baseRadius) * share + 0.06}
              length={0.3}
              position={[0, TOWER_HEIGHT * share, 0]}
            />
          ))}
          <Block
            kind="castIron"
            size={[1, 2.2, 0.1]}
            position={[0, 1.6, tower.baseRadius - 0.02]}
          />
          {/* The yaw bearing and the bedplate the drivetrain sits on. */}
          <Cylinder
            kind="castIron"
            radius={tower.topRadius + 0.15}
            length={0.4}
            position={[0, TOWER_HEIGHT + 0.1, 0]}
          />
          <Block
            kind="castIron"
            size={[2.4, 0.5, NACELLE_LENGTH - 1]}
            position={[0, nacelle.bottom + 0.35, NACELLE_MIDDLE - 0.3]}
          />
        </>,
      )}

      {part(
        'nacelleCover',
        <>
          <NacelleShell kind={coverPaint} />
          {/* The cooler on the roof, and the wind vane and anemometer mast behind it. */}
          <Block
            kind={coverPaint}
            size={[2.2, 0.8, 1.6]}
            position={[0, nacelle.bottom + nacelle.height + 0.4, nacelle.back + 1.4]}
          />
          <Cylinder
            kind="castIron"
            radius={0.06}
            length={1.6}
            position={[0.9, nacelle.bottom + nacelle.height + 0.8, nacelle.back + 3.2]}
          />
        </>,
      )}

      {part(
        'mainShaft',
        <group position={[0, HUB_HEIGHT, 0]}>
          <Cylinder
            kind="motion"
            radius={mainShaft.radius}
            length={mainShaft.front - mainShaft.back}
            position={[0, 0, (mainShaft.front + mainShaft.back) / 2]}
            rotation={ALONG_Z}
          />
          {/* The main bearing that carries the rotor's weight. */}
          <Block
            kind="motionDark"
            size={[1.6, 1.5, 0.9]}
            position={[0, -0.25, mainShaft.front - 1]}
          />
        </group>,
      )}

      {part(
        'gearbox',
        <group position={[0, HUB_HEIGHT, 0]}>
          <Cylinder
            kind="motion"
            radius={gearbox.radius}
            length={gearbox.front - gearbox.back}
            position={[0, 0, (gearbox.front + gearbox.back) / 2]}
            rotation={ALONG_Z}
          />
          {/* Torque arms out to the sides, and the fast shaft and brake disc behind. */}
          <Block kind="motion" size={[3.4, 0.5, 0.8]} position={[0, -0.3, gearbox.front - 0.8]} />
          <Cylinder
            kind="motionLight"
            radius={0.14}
            length={gearbox.back - generator.front}
            position={[0, 0.5, (gearbox.back + generator.front) / 2]}
            rotation={ALONG_Z}
          />
          <Cylinder
            kind="motionDark"
            radius={0.5}
            length={0.08}
            position={[0, 0.5, gearbox.back - 0.35]}
            rotation={ALONG_Z}
          />
        </group>,
      )}

      {part(
        'generator',
        <group position={[0, HUB_HEIGHT + 0.5, 0]}>
          <Cylinder
            kind="electric"
            radius={generator.radius}
            length={generator.front - generator.back}
            position={[0, 0, (generator.front + generator.back) / 2]}
            rotation={ALONG_Z}
          />
          {/* Its end shields and the box where its cables leave. */}
          {[generator.front, generator.back].map((z) => (
            <Cylinder
              key={z}
              kind="electricDark"
              radius={generator.radius * 0.85}
              length={0.15}
              position={[0, 0, z]}
              rotation={ALONG_Z}
            />
          ))}
          <Block
            kind="electric"
            size={[0.7, 0.5, 0.9]}
            position={[0, generator.radius + 0.2, (generator.front + generator.back) / 2]}
          />
        </group>,
      )}

      {/* The rotor: hub and blades turn together on the main shaft. */}
      <group ref={rotor} position={[0, HUB_HEIGHT, hub.center]}>
        {part(
          'hub',
          <>
            <Cylinder
              kind="motion"
              radius={hub.radius}
              length={hub.length * 0.55}
              position={[0, 0, -hub.length * 0.15]}
              rotation={ALONG_Z}
            />
            <mesh position={[0, 0, hub.length * 0.35]} rotation={ALONG_Z}>
              <coneGeometry args={[hub.radius, hub.length * 0.6, 32]} />
              <SurfaceMaterial kind="motion" />
              <Outline />
            </mesh>
          </>,
        )}
        {part(
          'blades',
          [0, 1, 2].map((index) => (
            <group key={index} rotation={[0, 0, (index * 2 * Math.PI) / 3]}>
              <Blade kind="motionLight" />
            </group>
          )),
        )}
      </group>
    </group>
  );
}

/**
 * The nacelle's cover: flat sides, and a roof and floor that curve in to a rounded nose where it
 * meets the spinner. Its side profile is drawn once and stretched across the nacelle's width.
 */
function NacelleShell({ kind }: { kind: SurfaceKind }) {
  const geometry = useMemo(() => {
    const { front, back, height, width } = nacelle;
    // In the side profile, x runs along the rotor's axis (toward the wind) and y up from the floor.
    const profile = new Shape();
    profile.moveTo(back, 0);
    profile.lineTo(front - 1.2, 0);
    profile.quadraticCurveTo(front, 0, front, height * 0.3);
    profile.lineTo(front, height * 0.72);
    profile.quadraticCurveTo(front - 0.3, height, front - 3, height);
    profile.lineTo(back, height);
    profile.closePath();
    return new ExtrudeGeometry(profile, { depth: width, bevelEnabled: false, curveSegments: 16 });
  }, []);
  // A quarter turn about y lays the profile along z and stretches it across x, from one side to
  // the other.
  return (
    <mesh
      geometry={geometry}
      position={[nacelle.width / 2, nacelle.bottom, 0]}
      rotation={[0, -Math.PI / 2, 0]}
    >
      <SurfaceMaterial kind={kind} />
      <Outline />
    </mesh>
  );
}

/** One blade, its root at the hub's edge, reaching up (+y) in its own frame. */
function Blade({ kind }: { kind: SurfaceKind }) {
  const geometry = useMemo(
    () =>
      bladeGeometry({
        length: blades.length - blades.root,
        rootChord: blades.rootChord,
        tipChord: blades.tipChord,
      }),
    [],
  );
  return (
    <mesh geometry={geometry} position={[0, blades.root, 0]}>
      <SurfaceMaterial kind={kind} />
      <Outline />
    </mesh>
  );
}

/** A tube narrowing from its foot to its top, standing on the ground. */
function TaperedTube({
  kind,
  bottom,
  top,
  height,
}: {
  kind: SurfaceKind;
  bottom: number;
  top: number;
  height: number;
}) {
  return (
    <mesh position={[0, height / 2, 0]}>
      <cylinderGeometry args={[top, bottom, height, 48]} />
      <SurfaceMaterial kind={kind} />
      <Outline />
    </mesh>
  );
}

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
  selectPart: (partId: string) => void;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  // A part that is off still sits in the scene, hidden, and three.js still finds it under the
  // pointer. Clicks go through it, and through the see-through cover, to what is drawn behind.
  const clickable = () => {
    const view = getView();
    if (view.removedParts.includes(id)) return false;
    return !(id === 'nacelleCover' && coverSeeThrough(view));
  };

  useFrame(() => {
    if (!group.current) return;
    const view = getView();
    const [x, y, z] = EXPLODE[id] ?? [0, 0, 0];
    group.current.position.set(x * view.explode, y * view.explode, z * view.explode);
    group.current.visible = !view.removedParts.includes(id);
  });

  return (
    <group
      ref={group}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (!interactive || !clickable()) return;
        event.stopPropagation();
        selectPart(id);
      }}
      onPointerOver={() => {
        if (interactive && clickable()) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {children}
    </group>
  );
}
