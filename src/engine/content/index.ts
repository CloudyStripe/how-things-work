import { content } from '@content/index';
import { instruments } from '@/instruments/registry';
import { models } from '@/models/registry';
import type { AnyModel } from '@/models/types';
import { overlays } from '@/overlays/catalog';
import type { Experiment, Module, Term } from './schema';
import { validateContent } from './validate';

// The engine's view of all content: validated once at load, then looked up by id.

const problems = validateContent(content, { models, overlays, instruments });
if (problems.length > 0) {
  throw new Error(`Content failed validation:\n${problems.map((p) => `- ${p}`).join('\n')}`);
}

export const moduleMap = content.moduleMap;
export const glossary = content.glossary;

export function findModule(moduleId: string): Module | undefined {
  return content.modules.find((module) => module.id === moduleId);
}

export function findExperiment(module: Module, experimentId: string): Experiment | undefined {
  return module.experiments.find((experiment) => experiment.id === experimentId);
}

/** The model an experiment runs. Validation guarantees it exists. */
export function modelFor(experiment: Experiment): AnyModel {
  const model = models[experiment.model];
  if (model === undefined) throw new Error(`No model "${experiment.model}"`);
  return model;
}

export function findTerm(termId: string): Term | undefined {
  return glossary.terms.find((term) => term.id === termId);
}

/** Where a term is named: the experiment whose Reveal names it, and its module. */
export function termIntroduction(
  term: Term,
): { module: Module; experiment: Experiment } | undefined {
  for (const module of content.modules) {
    const experiment = findExperiment(module, term.introducedIn);
    if (experiment !== undefined) return { module, experiment };
  }
  return undefined;
}

/** The terms a module's experiments name, in glossary order. */
export function moduleTerms(module: Module): Term[] {
  const experimentIds = new Set(module.experiments.map((experiment) => experiment.id));
  return glossary.terms.filter((term) => experimentIds.has(term.introducedIn));
}
