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
import {
  framedCamera,
  joinedFrame,
  movedFrame,
  type CameraFrame,
} from '@/models/shared/cameraFrame';
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
          getSnapshot={getSnapshot}
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
/** How quickly (s) a following camera catches up: about two thirds of the way in this time. */
const FOLLOW_TIME = 0.3;

interface Flight {
  readonly from: { readonly position: Vector3; readonly target: Vector3 };
  readonly to: { readonly position: Vector3; readonly target: Vector3 };
  readonly start: number;
}

/** A part's frame where the part is now: moved out with it as the exploded view opens. */
function partFrame(
  view: SceneView,
  part: string | undefined,
  explode: number,
): CameraFrame | undefined {
  const frame = part === undefined ? undefined : view.partFrames?.[part];
  if (part === undefined || frame === undefined) return undefined;
  const [x, y, z] = view.explode?.[part] ?? [0, 0, 0];
  return movedFrame(frame, [x * explode, y * explode, z * explode]);
}

/**
 * The orbit camera. Its default view is fitted to the canvas: the scene's frame fills it at any
 * window size, and Reset view returns there. A resize fits it again. A scene can instead have
 * the camera follow its model, easing to a frame worked out from the model's state each frame.
 * In an explorer the camera flies to each part, where it is now, as it is picked, removed or put
 * back, and stays on a picked part as the view explodes. It flies to an overlay's own view when
 * the overlay turns on. Once the learner turns, pans or zooms, the camera is theirs.
 */
function ViewControls({
  view,
  resetSignal,
  getView,
  getSnapshot,
  activeOverlays,
}: {
  view: SceneView;
  resetSignal: number;
  getView: () => ExplorerView;
  getSnapshot: () => SimSnapshot<unknown>;
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
  const seen = useRef({
    selected: getView().selectedPart,
    removed: getView().removedParts,
    explode: getView().explode,
  });
  const overlaysSeen = useRef(activeOverlays);
  /** Whether the camera follows the model (until the learner takes it). */
  const following = useRef(view.follow !== undefined);
  /** The frame a following camera last aimed for. */
  const held = useRef<CameraFrame | null>(null);
  /** Whether the camera went to the picked part and stays on it as the view explodes. */
  const onPart = useRef(false);
  const goal = useMemo(() => ({ position: new Vector3(), target: new Vector3() }), []);
  const shift = useMemo(() => new Vector3(), []);

  const flyTo = useCallback(
    (frame: CameraFrame | undefined, toPart = false) => {
      const orbit = controls.current;
      if (frame === undefined || orbit === null) return;
      onPart.current = toPart;
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
  useFrame((_, delta) => {
    const orbit = controls.current;
    const { selectedPart, removedParts, explode } = getView();
    const before = seen.current;
    if (selectedPart !== before.selected && selectedPart !== null) {
      flyTo(partFrame(view, selectedPart, explode), true);
    } else if (removedParts.length > before.removed.length) {
      flyTo(partFrame(view, removedParts.at(-1), explode));
    } else if (removedParts.length < before.removed.length) {
      // One part put back: look at it. Everything put back at once (Reset model): the whole.
      const putBack = before.removed.find((part) => !removedParts.includes(part));
      flyTo(
        removedParts.length === 0 && before.removed.length > 1
          ? view.frame
          : partFrame(view, putBack, explode),
      );
    } else if (explode !== before.explode && selectedPart !== null && onPart.current) {
      // The picked part moves out or in with the exploded view, and the camera moves with it.
      const [x, y, z] = view.explode?.[selectedPart] ?? [0, 0, 0];
      const moved = explode - before.explode;
      shift.set(x * moved, y * moved, z * moved);
      camera.position.add(shift);
      orbit?.target.add(shift);
      for (const end of flight.current === null ? [] : [flight.current.from, flight.current.to]) {
        end.position.add(shift);
        end.target.add(shift);
      }
      orbit?.update();
    }
    seen.current = { selected: selectedPart, removed: removedParts, explode };

    if (orbit === null) return;
    // After the orbit controls have moved the camera; they carry on from here next frame.
    if (view.cameraFloor !== undefined && camera.position.y < view.cameraFloor) {
      camera.position.setY(view.cameraFloor);
      camera.lookAt(orbit.target);
    }
    const current = flight.current;
    if (current !== null) {
      const t = Math.min(1, (clock.elapsedTime - current.start) / FLIGHT_TIME);
      // Ease in and out, so the camera neither jumps off nor stops dead.
      const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      camera.position.lerpVectors(current.from.position, current.to.position, eased);
      orbit.target.lerpVectors(current.from.target, current.to.target, eased);
      orbit.update();
      if (t >= 1) flight.current = null;
    } else if (view.follow !== undefined && following.current) {
      // A following camera eases toward the frame for the model as it is now, the same at any
      // frame rate. While the learner drags something across the model (dragging pauses
      // orbiting), the view only widens: closing in would slide the object on under a still
      // pointer. It closes in once they let go.
      let frame = view.follow(getSnapshot());
      if (!orbit.enabled && held.current !== null) frame = joinedFrame(held.current, frame);
      held.current = frame;
      const wanted = framedCamera(frame, FOV, aspect);
      const share = 1 - Math.exp(-delta / FOLLOW_TIME);
      camera.position.lerp(goal.position.set(...wanted.position), share);
      orbit.target.lerp(goal.target.set(...wanted.target), share);
      orbit.update();
    }
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

  // Place the camera before the frame is drawn, and remember it for Reset view. A following
  // camera starts on the model as it is, not at the widest view.
  useLayoutEffect(() => {
    const orbit = controls.current;
    if (orbit === null) return;
    const start =
      view.follow === undefined ? framed : framedCamera(view.follow(getSnapshot()), FOV, aspect);
    camera.position.set(...start.position);
    orbit.target.set(...start.target);
    orbit.update();
    orbit.saveState();
  }, [camera, framed, view, getSnapshot, aspect]);

  // Reset view (Whole turbine, in an explorer) flies back to the default view, or sets a
  // following camera following again.
  useEffect(() => {
    if (resetSignal === 0) return;
    if (view.follow === undefined) {
      flyTo(view.frame);
    } else {
      flight.current = null;
      following.current = true;
    }
  }, [resetSignal, flyTo, view]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      minDistance={framed.distance * view.zoom.min}
      maxDistance={framed.distance * view.zoom.max}
      maxPolarAngle={view.maxPolar ?? Math.PI * 0.45}
      enableDamping
      onStart={() => {
        // The learner takes over: any flight stops where it is, and nothing follows.
        flight.current = null;
        following.current = false;
        onPart.current = false;
      }}
      onChange={() => controls.current?.target.clamp(panMin, panMax)}
    />
  );
}
