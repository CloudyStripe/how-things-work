import { useEffect, useRef } from 'react';
import type { SimSnapshot } from '@/models/types';
import { useSimStore } from './store';

/**
 * Steps the simulation once per animation frame, then hands the new snapshot to `onFrame`
 * (where the experiment checks prompts and its challenge). It runs on its own clock, apart from
 * the 3D view, so the physics keeps going even if the view cannot start.
 */
export function useSimLoop(onFrame: (snapshot: SimSnapshot<unknown>) => void): void {
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
      const { snapshot } = useSimStore.getState();
      if (snapshot !== null) latest.current(snapshot);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
}
