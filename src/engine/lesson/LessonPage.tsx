import { useParams } from 'react-router';
import { findLesson, findModule, modelFor } from '@/engine/content';
import type { Lesson, Module } from '@/engine/content/schema';
import { NotFoundPage } from '@/engine/NotFoundPage';
import { ModelStage } from './ModelStage';
import { PatternDrawer } from './PatternDrawer';
import { SidePanel } from './SidePanel';
import { StepPanel } from './StepPanel';
import { useLessonRunner } from './useLessonRunner';

export function LessonPage() {
  const { moduleId = '', lessonId = '' } = useParams();
  const module = findModule(moduleId);
  const lesson = module === undefined ? undefined : findLesson(module, lessonId);
  if (module === undefined || lesson === undefined) return <NotFoundPage />;
  return <LessonRunnerView key={lesson.id} module={module} lesson={lesson} />;
}

/**
 * The spec's laptop layout: the lesson on the left, the model in the centre, controls and
 * instruments (or the take-apart tools) on the right, and the readings drawer along the bottom
 * during Pattern.
 */
function LessonRunnerView({ module, lesson }: { module: Module; lesson: Lesson }) {
  const model = modelFor(lesson);
  const runner = useLessonRunner(module, lesson, model);
  const pattern = lesson.kind === 'model' ? lesson.steps.pattern : undefined;

  return (
    <div className="lesson">
      <StepPanel module={module} lesson={lesson} runner={runner} />
      <ModelStage
        lesson={lesson}
        model={model}
        step={runner.step}
        interactive={runner.interactive}
      />
      <SidePanel lesson={lesson} model={model} interactive={runner.interactive} />
      {runner.step === 'pattern' && pattern !== undefined && (
        <PatternDrawer pattern={pattern} model={model} rows={runner.patternRows} />
      )}
    </div>
  );
}
