import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import type { Experiment } from '@/engine/content/schema';
import { useSimStore } from '@/engine/sim/store';
import type { AnyModel } from '@/models/types';
import { overlays } from '@/overlays/catalog';

// three.js and the scenes load only when an experiment opens.
const ModelViewport = lazy(() => import('./ModelViewport'));

interface ModelStageProps {
  readonly experiment: Experiment;
  readonly model: AnyModel;
  readonly unlocked: boolean;
}

/** The centre: the overlay toggle bar and Reset view above the 3D model. */
export function ModelStage({ experiment, model, unlocked }: ModelStageProps) {
  const active = useSimStore((state) => state.overlays);
  const setOverlay = useSimStore((state) => state.setOverlay);
  const [resetSignal, setResetSignal] = useState(0);
  const notToScale = active.some((id) => overlays[id]?.notToScale === true);

  return (
    <section className="experiment-stage" aria-label="Model">
      <div className="stage-toolbar">
        <div className="overlay-bar" role="group" aria-label="Overlays">
          {experiment.overlays.map((id) => {
            const on = active.includes(id);
            return (
              <button
                key={id}
                type="button"
                className="toggle"
                aria-pressed={on}
                disabled={!unlocked}
                onClick={() => setOverlay(id, !on)}
              >
                {overlays[id]?.label ?? id}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="button-quiet"
          onClick={() => setResetSignal((count) => count + 1)}
        >
          Reset view
        </button>
      </div>
      <div className={unlocked ? 'stage-view' : 'stage-view is-locked'}>
        <ViewportBoundary>
          <Suspense fallback={<p className="stage-message">Loading the model</p>}>
            <ModelViewport modelId={model.id} activeOverlays={active} resetSignal={resetSignal} />
          </Suspense>
        </ViewportBoundary>
        {notToScale && <span className="not-to-scale">Not to scale</span>}
        {!unlocked && (
          <div className="stage-lock">
            <p>Make your prediction to unlock the model.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/** If the 3D view cannot start (no WebGL), say so; the controls and instruments still work. */
class ViewportBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="stage-message">
          The 3D view could not start in this browser. The controls and instruments still work.
        </p>
      );
    }
    return this.props.children;
  }
}
