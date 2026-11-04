import { lazy, Suspense, useEffect } from 'react';
import { modelFor } from '@/engine/content';
import type { ModelLesson } from '@/engine/content/schema';
import { useSimStore } from '@/engine/sim/store';
import { useSimLoop } from '@/engine/sim/useSimLoop';
import { ControlInput } from './SidePanel';

// three.js and the scenes load only when a model is opened.
const ModelViewport = lazy(() => import('./ModelViewport'));

/**
 * A lesson's model, live and working, with its controls beside it: for trying something out
 * away from the lesson, such as before answering a prediction card. It starts afresh each time.
 */
export function LiveModel({ lesson }: { lesson: ModelLesson }) {
  const model = modelFor(lesson);

  useEffect(() => {
    useSimStore.getState().load(model);
  }, [model]);
  // Steps the model; there are no prompts or challenge to check here.
  useSimLoop(() => {});

  return (
    <div className="live-model">
      <div className="live-model-view">
        <Suspense fallback={<p className="stage-message">Loading the model</p>}>
          <ModelViewport
            modelId={model.id}
            activeOverlays={[]}
            labels={[]}
            interactive
            resetSignal={0}
          />
        </Suspense>
      </div>
      <div className="controls live-model-controls">
        {lesson.controls.map((id) => {
          const spec = model.controls[id];
          return spec === undefined ? null : (
            <ControlInput key={id} id={id} spec={spec} disabled={false} />
          );
        })}
      </div>
    </div>
  );
}
