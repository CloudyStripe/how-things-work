import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Matrix4, type Group, type InstancedMesh } from 'three';
import { BarMagnet } from '../shared/BarMagnet';
import { PaperClip } from '../shared/PaperClip';
import { Block, Cylinder, SurfaceMaterial } from '../shared/surfaces';
import { useBenchDrag } from '../shared/useBenchDrag';
import type { SceneProps } from '../types';
import {
  GLASS,
  GLASS_MAGNET_Z,
  MAGNET,
  MAGNET_HEIGHT,
  MAGNET_TRAVEL,
  FILING_COUNT,
  filingReleased,
  OBJECTS,
  PATH_Z,
  type FilingsBenchState,
} from './definition';

// The filings bench: a wooden guide with the learner's magnet against it, a beech peg, a copper
// coin and a steel paper clip in front, and at the back a magnet under a glass sheet on four feet.
// Every position, and every filing, comes from the simulation each frame.

const GUIDE = { length: 0.5, height: 0.012, width: 0.015 };
const GLASS_THICKNESS = 0.003;
const FOOT = 0.014;
/** An iron filing: 4 mm long, 0.45 mm across. */
const FILING = { length: 0.004, width: 0.00045 };

export function FilingsBenchScene({ getSnapshot, interactive, setControl }: SceneProps) {
  const magnet = useRef<Group>(null);
  const peg = useRef<Group>(null);
  const coin = useRef<Group>(null);
  const clip = useRef<Group>(null);
  // The engine pairs this scene only with its own model, so the state is this model's.
  const state = () => getSnapshot().state as FilingsBenchState;

  useFrame(() => {
    const current = state();
    magnet.current?.position.setX(current.magnet);
    for (const [id, group] of [
      ['peg', peg],
      ['coin', coin],
      ['clip', clip],
    ] as const) {
      const { x, z } = current.objects[id].body.position;
      group.current?.position.set(x, 0, z);
    }
  });

  const drag = useBenchDrag({
    enabled: interactive,
    height: MAGNET_HEIGHT,
    current: () => ({ x: state().magnet, z: PATH_Z }),
    onDrag(x) {
      const value = (x - MAGNET_TRAVEL.min) / (MAGNET_TRAVEL.max - MAGNET_TRAVEL.min);
      setControl('position', Math.min(1, Math.max(0, value)));
    },
  });

  const glassFeetX = GLASS.halfWidth - FOOT / 2;
  const glassFeetZ = GLASS.halfDepth - FOOT / 2;
  const glassBottom = GLASS.top - GLASS_THICKNESS;

  return (
    <group>
      <Block
        kind="wood"
        size={[GUIDE.length, GUIDE.height, GUIDE.width]}
        position={[0, GUIDE.height / 2, PATH_Z - MAGNET.side / 2 - GUIDE.width / 2]}
      />
      <group ref={magnet} position={[0, MAGNET_HEIGHT, PATH_Z]} {...drag}>
        <BarMagnet length={MAGNET.length} side={MAGNET.side} reversed={false} />
      </group>

      <group ref={peg}>
        <Cylinder
          kind="wood"
          radius={OBJECTS.peg.width / 2}
          length={OBJECTS.peg.length}
          position={[0, OBJECTS.peg.height, 0]}
          rotation={[0, 0, Math.PI / 2]}
        />
      </group>
      <group ref={coin}>
        <Cylinder
          kind="copper"
          radius={OBJECTS.coin.width / 2}
          length={OBJECTS.coin.height * 2}
          position={[0, OBJECTS.coin.height, 0]}
        />
      </group>
      <group ref={clip}>
        <group position-y={OBJECTS.clip.height}>
          <PaperClip
            length={OBJECTS.clip.length}
            width={OBJECTS.clip.width}
            wire={OBJECTS.clip.height}
          />
        </group>
      </group>

      <group position={[0, 0, GLASS_MAGNET_Z]}>
        <group position={[0, MAGNET_HEIGHT, 0]}>
          <BarMagnet length={MAGNET.length} side={MAGNET.side} reversed={false} />
        </group>
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <Block
              key={`${sx}${sz}`}
              kind="structure"
              size={[FOOT, glassBottom, FOOT]}
              position={[sx * glassFeetX, glassBottom / 2, sz * glassFeetZ]}
            />
          )),
        )}
        <Block
          kind="glass"
          size={[2 * GLASS.halfWidth, GLASS_THICKNESS, 2 * GLASS.halfDepth]}
          position={[0, GLASS.top - GLASS_THICKNESS / 2, 0]}
        />
      </group>
      <Filings getState={state} />
    </group>
  );
}

/** Every filing as one instance of a thin dark bar, placed from the simulation each frame. */
function Filings({ getState }: { getState: () => FilingsBenchState }) {
  const mesh = useRef<InstancedMesh>(null);
  const matrix = useMemo(() => new Matrix4(), []);
  const hidden = useMemo(() => new Matrix4().makeScale(0, 0, 0), []);

  useFrame(() => {
    if (mesh.current === null) return;
    const { filings } = getState();
    for (let index = 0; index < FILING_COUNT; index++) {
      const filing = filings[index];
      if (filing === undefined || !filingReleased(filing)) {
        mesh.current.setMatrixAt(index, hidden);
        continue;
      }
      // A bar along -z points north (bearing 0); turn it to the filing's bearing.
      matrix.makeRotationY(-filing.angle);
      matrix.setPosition(filing.position.x, GLASS.top + filing.position.y, filing.position.z);
      mesh.current.setMatrixAt(index, matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, FILING_COUNT]} frustumCulled={false}>
      <boxGeometry args={[FILING.width, FILING.width, FILING.length]} />
      <SurfaceMaterial kind="iron" />
    </instancedMesh>
  );
}
