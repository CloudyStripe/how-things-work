import type { ZodType } from 'zod';
import type { AnyModel } from '@/models/types';
import { glossarySchema, moduleMapSchema, moduleSchema, type ContentSources } from './schema';

// Checks all content together: each file against its schema, then every reference between
// files and registries, then the copy rules. The engine runs this at load and refuses to start
// on any problem; the test suite runs it too, so a bad content file fails CI.

export interface ContentRegistries {
  readonly models: Readonly<Record<string, AnyModel>>;
  readonly overlays: Readonly<Record<string, unknown>>;
  readonly instruments: Readonly<Record<string, unknown>>;
}

const EM_DASH = '—';

export function validateContent(sources: ContentSources, registries: ContentRegistries): string[] {
  const problems: string[] = [];

  collectSchemaProblems('map', moduleMapSchema, sources.moduleMap, problems);
  collectSchemaProblems('glossary', glossarySchema, sources.glossary, problems);
  sources.modules.forEach((module, index) => {
    collectSchemaProblems(`modules[${index}]`, moduleSchema, module, problems);
  });
  // Everything a learner reads, including the labels that models and overlays carry.
  collectEmDashes('content', sources, problems);
  collectEmDashes('models', registries.models, problems);
  collectEmDashes('overlays', registries.overlays, problems);
  collectEmDashes('instruments', registries.instruments, problems);
  if (problems.length > 0) return problems;

  const nodeIds = checkMap(sources, problems);
  const experimentIds = checkModules(sources, registries, nodeIds, problems);
  checkGlossary(sources, experimentIds, problems);
  return problems;
}

function checkMap({ moduleMap, modules }: ContentSources, problems: string[]): Set<string> {
  const nodeIds = new Set<string>();
  const cells = new Set<string>();
  for (const node of moduleMap.nodes) {
    if (nodeIds.has(node.moduleId)) problems.push(`map: "${node.moduleId}" appears twice`);
    nodeIds.add(node.moduleId);
    const cell = `${node.row},${node.column}`;
    if (cells.has(cell)) {
      problems.push(`map: two modules share row ${node.row}, column ${node.column}`);
    }
    cells.add(cell);
  }

  for (const node of moduleMap.nodes) {
    for (const base of node.builtOn) {
      if (!nodeIds.has(base)) {
        problems.push(`map: "${node.moduleId}" builds on unknown module "${base}"`);
      }
    }
    const module = modules.find((candidate) => candidate.id === node.moduleId);
    if (node.status === 'available' && module === undefined) {
      problems.push(`map: "${node.moduleId}" is available but has no module file`);
    }
    if (node.status === 'coming-later' && module !== undefined) {
      problems.push(`map: "${node.moduleId}" has a module file but is marked coming later`);
    }
    if (module === undefined) continue;
    if (module.title !== node.title) {
      problems.push(
        `map: "${node.moduleId}" is titled "${node.title}" but its module file says "${module.title}"`,
      );
    }
    if (!sameMembers(module.prerequisites, node.builtOn)) {
      problems.push(`module "${module.id}": prerequisites must match the map's builtOn arrows`);
    }
  }

  for (const module of modules) {
    if (!nodeIds.has(module.id)) problems.push(`module "${module.id}" is not on the map`);
  }
  return nodeIds;
}

function checkModules(
  { modules }: ContentSources,
  registries: ContentRegistries,
  nodeIds: Set<string>,
  problems: string[],
): Set<string> {
  const experimentIds = new Set<string>();
  for (const module of modules) {
    for (const prerequisite of module.prerequisites) {
      if (!nodeIds.has(prerequisite)) {
        problems.push(`module "${module.id}": unknown prerequisite "${prerequisite}"`);
      }
    }

    for (const experiment of module.experiments) {
      const where = `experiment "${experiment.id}"`;
      if (experimentIds.has(experiment.id)) problems.push(`${where} is defined twice`);
      experimentIds.add(experiment.id);

      const model = registries.models[experiment.model];
      if (model === undefined) {
        problems.push(`${where}: unknown model "${experiment.model}"`);
        continue;
      }
      for (const control of experiment.controls) {
        if (!Object.hasOwn(model.controls, control)) {
          problems.push(`${where}: model "${model.id}" has no control "${control}"`);
        }
      }
      for (const { instrument, reading } of experiment.instruments) {
        if (!Object.hasOwn(registries.instruments, instrument)) {
          problems.push(`${where}: unknown instrument "${instrument}"`);
        }
        if (!Object.hasOwn(model.readings, reading)) {
          problems.push(`${where}: model "${model.id}" has no reading "${reading}"`);
        }
      }
      for (const overlay of experiment.overlays) {
        if (!Object.hasOwn(registries.overlays, overlay)) {
          problems.push(`${where}: unknown overlay "${overlay}"`);
        }
      }

      const { predict, reveal, pattern, world, recall } = experiment.steps;
      if (duplicates(predict.choices.map((choice) => choice.id))) {
        problems.push(`${where}: two prediction choices share an id`);
      }
      if (reveal.overlay !== undefined && !experiment.overlays.includes(reveal.overlay)) {
        problems.push(
          `${where}: the Reveal turns on "${reveal.overlay}", which the experiment does not list`,
        );
      }
      if (pattern !== undefined) {
        if (!experiment.controls.includes(pattern.control)) {
          problems.push(`${where}: the Pattern varies "${pattern.control}", which is not exposed`);
        }
        if (!Object.hasOwn(model.readings, pattern.reading)) {
          problems.push(`${where}: model "${model.id}" has no reading "${pattern.reading}"`);
        }
      }
      for (const item of world.items) {
        if (item.module !== undefined && !nodeIds.has(item.module)) {
          problems.push(`${where}: In the world points to unknown module "${item.module}"`);
        }
      }
      if (duplicates(recall.cards.map((card) => card.id))) {
        problems.push(`${where}: two recall cards share an id`);
      }
    }
  }
  return experimentIds;
}

function checkGlossary(
  { glossary, modules }: ContentSources,
  experimentIds: Set<string>,
  problems: string[],
): void {
  const termIds = new Set<string>();
  const formOwners = new Map<string, string>();
  for (const term of glossary.terms) {
    if (termIds.has(term.id)) problems.push(`term "${term.id}" is defined twice`);
    termIds.add(term.id);
    for (const form of [term.name, ...term.forms]) {
      const key = form.toLowerCase();
      const owner = formOwners.get(key);
      if (owner !== undefined && owner !== term.id) {
        problems.push(`terms "${owner}" and "${term.id}" both match the text "${form}"`);
      }
      formOwners.set(key, term.id);
    }
  }

  const namedIn = new Map<string, string[]>();
  for (const module of modules) {
    for (const experiment of module.experiments) {
      for (const termId of experiment.steps.reveal.names) {
        if (!termIds.has(termId)) {
          problems.push(`experiment "${experiment.id}": the Reveal names unknown term "${termId}"`);
        }
        namedIn.set(termId, [...(namedIn.get(termId) ?? []), experiment.id]);
      }
    }
  }

  for (const term of glossary.terms) {
    for (const related of term.related) {
      if (!termIds.has(related))
        problems.push(`term "${term.id}": unknown related term "${related}"`);
    }
    if (!experimentIds.has(term.introducedIn)) {
      problems.push(`term "${term.id}": introduced in unknown experiment "${term.introducedIn}"`);
    }
    const places = namedIn.get(term.id) ?? [];
    if (places.length !== 1) {
      problems.push(
        `term "${term.id}" is named in ${places.length} Reveal steps; name it in exactly one`,
      );
    } else if (places[0] !== term.introducedIn) {
      problems.push(
        `term "${term.id}" is named in "${places[0]}" but says it is introduced in "${term.introducedIn}"`,
      );
    }
  }

  for (const [first, second] of glossary.confusablePairs) {
    for (const termId of [first, second]) {
      if (!termIds.has(termId)) problems.push(`confusable pair: unknown term "${termId}"`);
    }
    if (first === second) problems.push(`confusable pair: "${first}" is paired with itself`);
  }
}

function collectSchemaProblems(
  label: string,
  schema: ZodType,
  value: unknown,
  problems: string[],
): void {
  const result = schema.safeParse(value);
  if (result.success) return;
  for (const issue of result.error.issues) {
    const path = issue.path.length > 0 ? ` ${issue.path.join('.')}` : '';
    problems.push(`${label}${path}: ${issue.message}`);
  }
}

function collectEmDashes(path: string, value: unknown, problems: string[]): void {
  if (typeof value === 'string') {
    if (value.includes(EM_DASH)) {
      problems.push(
        `${path}: learner-facing text has an em dash; use a comma, colon, parentheses or two sentences`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectEmDashes(`${path}[${index}]`, item, problems));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value))
      collectEmDashes(`${path}.${key}`, item, problems);
  }
}

function duplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}
