import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentRef,
  type RefObject,
} from 'react';
import { Vector3 } from 'three';
import { useSimStore } from '@/engine/sim/store';
import { models } from '@/models/registry';
import { scenes, type SceneView } from '@/models/scenes';
import { framedCamera } from '@/models/shared/cameraFrame';
import { Stage } from '@/models/shared/Stage';
import type { AnyModel, ExplorerView, SimSnapshot } from '@/models/types';
import { overlayLayers } from '@/overlays/layers';

/**
 * The camera's vertical field of view (degrees): narrow, so the near and far ends of a bench
 * keep close to the same size, as in a technical drawing.
 */
const FOV = 30;

export interface ViewportLabel {
  readonly anchor: string;
  readonly text: string;
}

interface ModelViewportProps {
  readonly modelId: string;
  readonly activeOverlays: readonly string[];
  /** Labels to pin to the model now (Look, or when the learner turns them on). */
  readonly labels: readonly ViewportLabel[];
  readonly interactive: boolean;
  /** Changes each time the learner presses Reset view. */
  readonly resetSignal: number;
}

/** The 3D canvas: the model's scene, any active overlay layers, labels and the orbit camera. */
export default function ModelViewport({
  modelId,
  activeOverlays,
  labels,
  interactive,
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
  const getView = useCallback((): ExplorerView => useSimStore.getState().view, []);
  const { setControl, selectPart } = useSimStore.getState();
  // The labels are plain elements over the canvas; LabelTracker moves them every frame.
  const labelElements = useRef(new Map<string, HTMLElement>());
  if (model === undefined || view === undefined || !ready) return null;

  const { Scene } = view;
  return (
    <div className="viewport" role="img" aria-label={model.title}>
      {/* Flat: no tone mapping, so the illustration's colours show as drawn. */}
      <Canvas
        flat
        camera={{
          position: framedCamera(view.frame, FOV, 1).position,
          fov: FOV,
          near: view.clip.near,
          far: view.clip.far,
        }}
        dpr={[1, 2]}
      >
        <Stage view={view} />
        <Scene
          getSnapshot={getSnapshot}
          getView={getView}
          interactive={interactive}
          setControl={setControl}
          selectPart={selectPart}
        />
        {activeOverlays.map((id) => {
          const Layer = overlayLayers[id];
          return Layer === undefined ? null : (
            <Layer key={id} model={model} getSnapshot={getSnapshot} />
          );
        })}
        <LabelTracker
          model={model}
          labels={labels}
          elements={labelElements}
          getSnapshot={getSnapshot}
        />
        <ViewControls view={view} resetSignal={resetSignal} />
      </Canvas>
      {labels.map((label) => (
        <span
          key={label.anchor}
          className="model-label"
          ref={(element) => {
            if (element === null) labelElements.current.delete(label.anchor);
            else labelElements.current.set(label.anchor, element);
          }}
        >
          {label.text}
        </span>
      ))}
    </div>
  );
}

/**
 * Keeps each label over its anchor on the model: every frame it projects the anchor through the
 * camera and moves the label there, hiding it when the anchor is behind the camera.
 */
function LabelTracker({
  model,
  labels,
  elements,
  getSnapshot,
}: {
  model: AnyModel;
  labels: readonly ViewportLabel[];
  elements: RefObject<Map<string, HTMLElement>>;
  getSnapshot: () => SimSnapshot<unknown>;
}) {
  const point = useMemo(() => new Vector3(), []);

  useFrame(({ camera, size }) => {
    const snapshot = getSnapshot();
    for (const label of labels) {
      const element = elements.current.get(label.anchor);
      const anchor = model.anchors?.[label.anchor];
      if (element === undefined || anchor === undefined) continue;
      const { x, y, z } = anchor(snapshot);
      point.set(x, y, z).project(camera);
      const visible = point.z < 1;
      element.style.visibility = visible ? 'visible' : 'hidden';
      const left = ((point.x + 1) / 2) * size.width;
      const top = ((1 - point.y) / 2) * size.height;
      element.style.transform = `translate(${left}px, ${top}px) translate(-50%, -100%)`;
    }
  });

  return null;
}

/**
 * The orbit camera. Its default view is fitted to the canvas: the scene's frame fills it at any
 * window size, and Reset view returns there. A resize fits it again.
 */
function ViewControls({ view, resetSignal }: { view: SceneView; resetSignal: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const framed = useMemo(
    () => framedCamera(view.frame, FOV, width / Math.max(1, height)),
    [view, width, height],
  );
  const [panMin, panMax] = useMemo(() => {
    const [x, y, z] = framed.target;
    const limit = view.pan;
    return [
      new Vector3(x - limit, y - limit, z - limit),
      new Vector3(x + limit, y + limit, z + limit),
    ];
  }, [framed, view]);

  // Place the camera before the frame is drawn, and remember it for Reset view.
  useLayoutEffect(() => {
    const orbit = controls.current;
    if (orbit === null) return;
    camera.position.set(...framed.position);
    orbit.target.set(...framed.target);
    orbit.update();
    orbit.saveState();
  }, [camera, framed]);

  useEffect(() => {
    if (resetSignal > 0) controls.current?.reset();
  }, [resetSignal]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      minDistance={framed.distance * view.zoom.min}
      maxDistance={framed.distance * view.zoom.max}
      maxPolarAngle={Math.PI * 0.45}
      enableDamping
      onChange={() => controls.current?.target.clamp(panMin, panMax)}
    />
  );
}
