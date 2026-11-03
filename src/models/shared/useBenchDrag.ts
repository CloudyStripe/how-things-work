import type { ThreeEvent } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Plane, Vector3 } from 'three';

interface BenchDragOptions {
  /** False while the lesson is not interactive: the object cannot be picked up. */
  readonly enabled: boolean;
  /** Height (m) of the level plane the object slides in. */
  readonly height: number;
  /** Where the object is now on the bench (m). */
  readonly current: () => { readonly x: number; readonly z: number };
  /** Called with where the pointer has dragged the object to. A rail uses only x. */
  onDrag(x: number, z: number): void;
}

type OrbitLike = { enabled: boolean } | null;

/** Pauses or resumes orbiting, so dragging the object does not also turn the view. */
function setOrbit(controls: unknown, enabled: boolean): void {
  const orbit = controls as OrbitLike;
  if (orbit !== null) orbit.enabled = enabled;
}

/**
 * Lets the learner drag an object across the bench, in a level plane at its height. Orbit
 * pauses while dragging, and the object keeps its grip point, so it does not jump to the pointer.
 */
export function useBenchDrag({ enabled, height, current, onDrag }: BenchDragOptions) {
  // Read at event time: the orbit controls register themselves after the scene mounts.
  const getThree = useThree((state) => state.get);
  const grip = useRef<{ x: number; z: number } | null>(null);
  const plane = useRef(new Plane(new Vector3(0, 1, 0), -height));
  const hit = useRef(new Vector3());

  function pointer(event: ThreeEvent<PointerEvent>): Vector3 | null {
    return event.ray.intersectPlane(plane.current, hit.current);
  }

  return {
    onPointerDown(event: ThreeEvent<PointerEvent>) {
      if (!enabled) return;
      const point = pointer(event);
      if (point === null) return;
      event.stopPropagation();
      (event.target as Element).setPointerCapture(event.pointerId);
      const at = current();
      grip.current = { x: point.x - at.x, z: point.z - at.z };
      setOrbit(getThree().controls, false);
      document.body.style.cursor = 'grabbing';
    },
    onPointerMove(event: ThreeEvent<PointerEvent>) {
      if (grip.current === null) return;
      const point = pointer(event);
      if (point !== null) onDrag(point.x - grip.current.x, point.z - grip.current.z);
    },
    onPointerUp(event: ThreeEvent<PointerEvent>) {
      if (grip.current === null) return;
      (event.target as Element).releasePointerCapture(event.pointerId);
      grip.current = null;
      setOrbit(getThree().controls, true);
      document.body.style.cursor = enabled ? 'grab' : '';
    },
    onPointerOver() {
      if (enabled && grip.current === null) document.body.style.cursor = 'grab';
    },
    onPointerOut() {
      if (grip.current === null) document.body.style.cursor = '';
    },
  };
}
