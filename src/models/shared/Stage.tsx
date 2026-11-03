import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import type { SceneView } from '../scenes';
import { useRenderStyle } from './renderStyle';

// The light and backdrop around a model, in the current style. The viewport also switches
// tone mapping and shadows with the style, since those belong to the renderer.

const PHOTOREAL_BACKGROUND = '#d9d6d0';
const ILLUSTRATION_BACKGROUND = '#f5f3ee';

export function Stage({ view }: { view: SceneView }) {
  const style = useRenderStyle((state) => state.style);
  return style === 'photoreal' ? <PhotorealStage view={view} /> : <IllustrationStage view={view} />;
}

/**
 * Studio lighting: soft boxes reflected in the varnish and paint, a key light that casts soft
 * shadows, and fog that fades the far tabletop into the backdrop.
 */
function PhotorealStage({ view }: { view: SceneView }) {
  const [x, y, z] = view.light;
  const distance = Math.hypot(x, y, z);
  const extent = view.extent;
  return (
    <>
      <color attach="background" args={[PHOTOREAL_BACKGROUND]} />
      {view.fog !== undefined && (
        <fog attach="fog" args={[PHOTOREAL_BACKGROUND, view.fog.near, view.fog.far]} />
      )}
      <Environment resolution={256} frames={1} environmentIntensity={0.5}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 1]} scale={[9, 9, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-6, 2.5, 3]} scale={[5, 3, 1]} />
        <Lightformer form="rect" intensity={0.7} position={[6, 2, -2]} scale={[5, 3, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[0, 1.5, 7]} scale={[8, 2, 1]} />
      </Environment>
      <hemisphereLight args={['#ffffff', '#a8977d', 0.25]} />
      {/* Soft darkening where parts meet the ground, which a shadow map alone misses. */}
      <ContactShadows
        position={[0, 0.0005, 0]}
        scale={extent * 2.5}
        far={extent * 0.15}
        blur={2.2}
        opacity={0.55}
        resolution={512}
      />
      <directionalLight
        castShadow
        position={view.light}
        intensity={3.2}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
        shadow-camera-near={distance * 0.05}
        shadow-camera-far={distance * 2.5}
        shadow-bias={-0.0002}
        shadow-normalBias={extent * 0.002}
        shadow-radius={6}
      />
    </>
  );
}

/**
 * Even light on a paper-coloured backdrop, so the flat colours read as drawn. The light sits
 * nearly overhead: tops take the lit tone and every side the middle one, and the outlines
 * separate them. three.js divides diffuse light by pi, so these intensities carry it back: a
 * lit top shows its colour exactly.
 */
function IllustrationStage({ view }: { view: SceneView }) {
  const [x, y, z] = view.light;
  const overhead: [number, number, number] = [x * 0.4, Math.hypot(x, y, z), z * 0.4];
  return (
    <>
      <color attach="background" args={[ILLUSTRATION_BACKGROUND]} />
      <ambientLight intensity={0.4 * Math.PI} />
      <directionalLight position={overhead} intensity={0.6 * Math.PI} />
    </>
  );
}
