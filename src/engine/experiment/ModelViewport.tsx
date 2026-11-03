import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useRef, type ComponentRef } from 'react';
import { Vector3 } from 'three';
import { useSimStore } from '@/engine/sim/store';
import { models } from '@/models/registry';
import { scenes, type SceneView } from '@/models/scenes';
import type { SimSnapshot } from '@/models/types';
import { overlayLayers } from '@/overlays/layers';

interface ModelViewportProps {
  readonly modelId: string;
  readonly activeOverlays: readonly string[];
  /** Changes each time the learner presses Reset view. */
  readonly resetSignal: number;
}

/** The 3D canvas: the model's scene, any active overlay layers, and the orbit camera. */
export default function ModelViewport({
  modelId,
  activeOverlays,
  resetSignal,
}: ModelViewportProps) {
  const model = models[modelId];
  const view = scenes[modelId];
  const ready = useSimStore((state) => state.snapshot !== null && state.model?.id === modelId);
  // Scenes read the latest frame inside useFrame, so the simulation never re-renders React.
  const getSnapshot = useCallback(
    () => useSimStore.getState().snapshot as SimSnapshot<unknown>,
    [],
  );
  if (model === undefined || view === undefined || !ready) return null;

  const { Scene } = view;
  return (
    <div className="viewport" role="img" aria-label={model.title}>
      <Canvas
        camera={{ position: view.camera.position, fov: 40, near: 0.005, far: 10 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#eceeef']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[0.3, 0.6, 0.4]} intensity={1.6} />
        <Scene getSnapshot={getSnapshot} />
        {activeOverlays.map((id) => {
          const Layer = overlayLayers[id];
          return Layer === undefined ? null : (
            <Layer key={id} model={model} getSnapshot={getSnapshot} />
          );
        })}
        <ViewControls view={view} resetSignal={resetSignal} />
      </Canvas>
    </div>
  );
}

/** Pan stays within this distance (metres) of the scene's centre. */
const PAN_LIMIT = 0.06;
const PAN_MIN = new Vector3(-PAN_LIMIT, -PAN_LIMIT, -PAN_LIMIT);
const PAN_MAX = new Vector3(PAN_LIMIT, PAN_LIMIT, PAN_LIMIT);

function ViewControls({ view, resetSignal }: { view: SceneView; resetSignal: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  // Remember the default view once the target is applied, so Reset view returns to it.
  useEffect(() => {
    controls.current?.saveState();
  }, []);

  useEffect(() => {
    if (resetSignal > 0) controls.current?.reset();
  }, [resetSignal]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={view.camera.target}
      minDistance={view.zoom.min}
      maxDistance={view.zoom.max}
      maxPolarAngle={Math.PI * 0.45}
      enableDamping
      onChange={() => controls.current?.target.clamp(PAN_MIN, PAN_MAX)}
    />
  );
}
