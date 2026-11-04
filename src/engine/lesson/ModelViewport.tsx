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
import { framedCamera, type CameraFrame } from '@/models/shared/cameraFrame';
import { Stage } from '@/models/shared/Stage';
import type { AnyModel, ExplorerView, SimSnapshot } from '@/models/types';
import { overlayLayers } from '@/overlays/layers';

/**
 * The camera's vertical field of view (degrees): narrow, so the near and far ends of a bench
 * keep close to the same size, as in a technical drawing.
 */
const FOV = 30;

/**
 * Add ?debug to the address (before the #) to show the frame rate over the model, with the
 * graphics chip it is drawn on.
 */
const DEBUG = new URLSearchParams(window.location.search).has('debug');

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
  const fpsElement = useRef<HTMLSpanElement>(null);
  const showFps = useCallback((text: string) => {
    if (fpsElement.current) fpsElement.current.textContent = text;
  }, []);
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
        {DEBUG && <FpsMeter report={showFps} />}
        <ViewControls
          view={view}
          resetSignal={resetSignal}
          getView={getView}
          activeOverlays={activeOverlays}
        />
      </Canvas>
      {DEBUG && <span className="fps-meter" ref={fpsElement} />}
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
 * The frame rate over the last half second, the average time per frame, and the graphics chip,
 * written straight into an element over the canvas so measuring never re-renders anything.
 */
function FpsMeter({ report }: { report: (text: string) => void }) {
  const gl = useThree((state) => state.gl);
  const chip = useMemo(() => {
    const context = gl.getContext();
    const info = context.getExtension('WEBGL_debug_renderer_info');
    return info === null
      ? 'graphics chip unknown'
      : String(context.getParameter(info.UNMASKED_RENDERER_WEBGL));
  }, [gl]);
  // When the current half second began (ms; 0 until the first frame), and frames since.
  const counting = useRef({ start: 0, frames: 0 });

  useFrame(() => {
    const now = performance.now();
    if (counting.current.start === 0) counting.current = { start: now, frames: 0 };
    const frames = counting.current.frames + 1;
    const elapsed = now - counting.current.start;
    if (elapsed < 500) {
      counting.current = { start: counting.current.start, frames };
      return;
    }
    const fps = (frames * 1000) / elapsed;
    report(`${fps.toFixed(0)} fps · ${(elapsed / frames).toFixed(1)} ms\n${chip}`);
    counting.current = { start: now, frames: 0 };
  });

  return null;
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

/** How long (s) the camera takes to fly to a part, an overlay's view or back to the default. */
const FLIGHT_TIME = 0.9;

interface Flight {
  readonly from: { readonly position: Vector3; readonly target: Vector3 };
  readonly to: { readonly position: Vector3; readonly target: Vector3 };
  readonly start: number;
}

/**
 * The orbit camera. Its default view is fitted to the canvas: the scene's frame fills it at any
 * window size, and Reset view returns there. A resize fits it again. In an explorer the camera
 * also flies to each part as it is picked, removed or put back, and to an overlay's own view
 * when it turns on; the learner can orbit and zoom freely from wherever it lands.
 */
function ViewControls({
  view,
  resetSignal,
  getView,
  activeOverlays,
}: {
  view: SceneView;
  resetSignal: number;
  getView: () => ExplorerView;
  activeOverlays: readonly string[];
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((state) => state.camera);
  const clock = useThree((state) => state.clock);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const aspect = width / Math.max(1, height);
  const framed = useMemo(() => framedCamera(view.frame, FOV, aspect), [view, aspect]);
  const flight = useRef<Flight | null>(null);
  const seen = useRef({ selected: getView().selectedPart, removed: getView().removedParts });
  const overlaysSeen = useRef(activeOverlays);

  const flyTo = useCallback(
    (frame: CameraFrame | undefined) => {
      const orbit = controls.current;
      if (frame === undefined || orbit === null) return;
      const goal = framedCamera(frame, FOV, aspect);
      flight.current = {
        from: { position: camera.position.clone(), target: orbit.target.clone() },
        to: { position: new Vector3(...goal.position), target: new Vector3(...goal.target) },
        start: clock.elapsedTime,
      };
    },
    [aspect, camera, clock],
  );

  // What changed in the explorer since the last frame decides where the camera goes.
  useFrame(() => {
    const { selectedPart, removedParts } = getView();
    const before = seen.current;
    if (selectedPart !== before.selected && selectedPart !== null) {
      flyTo(view.partFrames?.[selectedPart]);
    } else if (removedParts.length > before.removed.length) {
      flyTo(view.partFrames?.[removedParts.at(-1) ?? '']);
    } else if (removedParts.length < before.removed.length) {
      // One part put back: look at it. Everything put back at once (Reset model): the whole.
      const putBack = before.removed.find((part) => !removedParts.includes(part));
      flyTo(
        removedParts.length === 0 && before.removed.length > 1
          ? view.frame
          : view.partFrames?.[putBack ?? ''],
      );
    }
    seen.current = { selected: selectedPart, removed: removedParts };

    const current = flight.current;
    const orbit = controls.current;
    if (current === null || orbit === null) return;
    const t = Math.min(1, (clock.elapsedTime - current.start) / FLIGHT_TIME);
    // Ease in and out, so the camera neither jumps off nor stops dead.
    const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
    camera.position.lerpVectors(current.from.position, current.to.position, eased);
    orbit.target.lerpVectors(current.from.target, current.to.target, eased);
    orbit.update();
    if (t >= 1) flight.current = null;
  });

  // An overlay that reads best from somewhere particular takes the camera there as it turns on.
  useEffect(() => {
    const added = activeOverlays.find((id) => !overlaysSeen.current.includes(id));
    overlaysSeen.current = activeOverlays;
    if (added !== undefined) flyTo(view.overlayFrames?.[added]);
  }, [activeOverlays, flyTo, view]);
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

  // Reset view (Whole turbine, in an explorer) flies back to the default view.
  useEffect(() => {
    if (resetSignal > 0) flyTo(view.frame);
  }, [resetSignal, flyTo, view]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      minDistance={framed.distance * view.zoom.min}
      maxDistance={framed.distance * view.zoom.max}
      maxPolarAngle={Math.PI * 0.45}
      enableDamping
      onStart={() => {
        // The learner takes over: any flight stops where it is.
        flight.current = null;
      }}
      onChange={() => controls.current?.target.clamp(panMin, panMax)}
    />
  );
}
