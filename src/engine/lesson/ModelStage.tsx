import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import type { Lesson, StepKind } from '@/engine/content/schema';
import { useSimStore } from '@/engine/sim/store';
import type { AnyModel } from '@/models/types';
import { overlays } from '@/overlays/catalog';

// three.js and the scenes load only when a lesson opens.
const ModelViewport = lazy(() => import('./ModelViewport'));

interface ModelStageProps {
  readonly lesson: Lesson;
  readonly model: AnyModel;
  readonly step: StepKind;
  readonly interactive: boolean;
}

/** The centre: overlay toggles, labels, Reset model and Reset view above the 3D model. */
export function ModelStage({ lesson, model, step, interactive }: ModelStageProps) {
  const active = useSimStore((state) => state.overlays);
  const setOverlay = useSimStore((state) => state.setOverlay);
  const resetModel = useSimStore((state) => state.reset);
  const [resetSignal, setResetSignal] = useState(0);
  const [labelsOn, setLabelsOn] = useState(false);
  const notToScale = active.some((id) => overlays[id]?.notToScale === true);
  const labels = lesson.steps.look.labels ?? [];
  // Look always shows its labels; after Look the learner can bring them back.
  const showLabels = step === 'look' || labelsOn;

  return (
    <section className="lesson-stage" aria-label="Model">
      <div className="stage-toolbar">
        <div className="overlay-bar" role="group" aria-label="Overlays">
          {lesson.overlays.map((id) => {
            const on = active.includes(id);
            return (
              <button
                key={id}
                type="button"
                className="toggle"
                aria-pressed={on}
                disabled={!interactive}
                onClick={() => setOverlay(id, !on)}
              >
                {overlays[id]?.label ?? id}
              </button>
            );
          })}
          {labels.length > 0 && step !== 'look' && (
            <button
              type="button"
              className="toggle"
              aria-pressed={labelsOn}
              onClick={() => setLabelsOn((on) => !on)}
            >
              Labels
            </button>
          )}
        </div>
        <div className="stage-actions">
          <button
            type="button"
            className="button-quiet"
            disabled={!interactive}
            onClick={resetModel}
          >
            Reset model
          </button>
          <button
            type="button"
            className="button-quiet"
            onClick={() => setResetSignal((count) => count + 1)}
          >
            {model.wholeViewLabel ?? 'Reset view'}
          </button>
        </div>
      </div>
      <div className="stage-view">
        <ViewportBoundary>
          <Suspense fallback={<p className="stage-message">Loading the model</p>}>
            <ModelViewport
              modelId={model.id}
              activeOverlays={active}
              labels={showLabels ? labels : []}
              interactive={interactive}
              resetSignal={resetSignal}
            />
          </Suspense>
        </ViewportBoundary>
        {notToScale && <span className="not-to-scale">Not to scale</span>}
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
