import type { ThreeEvent } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Plane, Vector3 } from 'three';

interface RailDragOptions {
  /** False while the lesson is not interactive: the object cannot be picked up. */
  readonly enabled: boolean;
  /** Height (m) of the plane the object slides in. */
  readonly height: number;
  /** Where the object is now along the rail (x, m). */
  readonly currentX: () => number;
  /** Called with the x the pointer has dragged the object to. */
  onDrag(x: number): void;
}

type OrbitLike = { enabled: boolean } | null;

/** Pauses or resumes orbiting, so dragging the object does not also turn the view. */
function setOrbit(controls: unknown, enabled: boolean): void {
  const orbit = controls as OrbitLike;
  if (orbit !== null) orbit.enabled = enabled;
}

/**
 * Lets the learner drag an object along a rail that runs along x. Orbit pauses while dragging,
 * and the object keeps its grip point, so it does not jump to the pointer.
 */
export function useRailDrag({ enabled, height, currentX, onDrag }: RailDragOptions) {
  // Read at event time: the orbit controls register themselves after the scene mounts.
  const getThree = useThree((state) => state.get);
  const grip = useRef<number | null>(null);
  const plane = useRef(new Plane(new Vector3(0, 1, 0), -height));
  const hit = useRef(new Vector3());

  function pointerX(event: ThreeEvent<PointerEvent>): number | null {
    return event.ray.intersectPlane(plane.current, hit.current)?.x ?? null;
  }

  return {
    onPointerDown(event: ThreeEvent<PointerEvent>) {
      if (!enabled) return;
      const x = pointerX(event);
      if (x === null) return;
      event.stopPropagation();
      (event.target as Element).setPointerCapture(event.pointerId);
      grip.current = x - currentX();
      setOrbit(getThree().controls, false);
      document.body.style.cursor = 'grabbing';
    },
    onPointerMove(event: ThreeEvent<PointerEvent>) {
      if (grip.current === null) return;
      const x = pointerX(event);
      if (x !== null) onDrag(x - grip.current);
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
