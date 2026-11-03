import { useEffect, useRef } from 'react';
import type { ExplorerView, SimSnapshot } from '@/models/types';
import { useSimStore } from './store';

/**
 * Steps the simulation once per animation frame, then hands the new snapshot and the explorer
 * view to `onFrame` (where the lesson checks prompts and its challenge). It runs on its own
 * clock, apart from the 3D view, so the physics keeps going even if the view cannot start.
 */
export function useSimLoop(
  onFrame: (snapshot: SimSnapshot<unknown>, view: ExplorerView) => void,
): void {
  const latest = useRef(onFrame);
  useEffect(() => {
    latest.current = onFrame;
  });

  useEffect(() => {
    let frame = 0;
    let previous: number | null = null;
    const tick = (now: number) => {
      if (previous !== null) useSimStore.getState().advance((now - previous) / 1000);
      previous = now;
      const { snapshot, view } = useSimStore.getState();
      if (snapshot !== null) latest.current(snapshot, view);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
}
