import { useParams } from 'react-router';
import { findExperiment, findModule, modelFor } from '@/engine/content';
import type { Experiment, Module } from '@/engine/content/schema';
import { NotFoundPage } from '@/engine/NotFoundPage';
import { ModelStage } from './ModelStage';
import { PatternDrawer } from './PatternDrawer';
import { SidePanel } from './SidePanel';
import { StepPanel } from './StepPanel';
import { useExperimentRunner } from './useExperimentRunner';

export function ExperimentPage() {
  const { moduleId = '', experimentId = '' } = useParams();
  const module = findModule(moduleId);
  const experiment = module === undefined ? undefined : findExperiment(module, experimentId);
  if (module === undefined || experiment === undefined) return <NotFoundPage />;
  return <ExperimentRunnerView key={experiment.id} module={module} experiment={experiment} />;
}

/**
 * The spec's laptop layout: the lesson on the left, the model in the centre, controls and
 * instruments on the right, and the readings drawer along the bottom during Pattern.
 */
function ExperimentRunnerView({ module, experiment }: { module: Module; experiment: Experiment }) {
  const model = modelFor(experiment);
  const runner = useExperimentRunner(module, experiment, model);
  const { pattern } = experiment.steps;

  return (
    <div className="experiment">
      <StepPanel module={module} experiment={experiment} runner={runner} />
      <ModelStage experiment={experiment} model={model} unlocked={runner.unlocked} />
      <SidePanel experiment={experiment} model={model} unlocked={runner.unlocked} />
      {runner.step === 'pattern' && pattern !== undefined && (
        <PatternDrawer pattern={pattern} model={model} rows={runner.patternRows} />
      )}
    </div>
  );
}
