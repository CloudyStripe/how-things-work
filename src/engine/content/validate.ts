import type { ZodType } from 'zod';
import { removableParts, type AnyModel } from '@/models/types';
import {
  glossarySchema,
  moduleMapSchema,
  moduleSchema,
  type ContentSources,
  type Lesson,
  type Module,
} from './schema';

// Checks all content together: each file against its schema, then every reference between
// files and registries, then the copy rules. The engine runs this at load and refuses to start
// on any problem; the test suite runs it too, so a bad content file fails CI.

export interface ContentRegistries {
  readonly models: Readonly<Record<string, AnyModel>>;
  readonly overlays: Readonly<Record<string, unknown>>;
  readonly instruments: Readonly<Record<string, { readonly showsNumbers: boolean }>>;
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
  const lessonIds = checkModules(sources, registries, nodeIds, problems);
  checkGlossary(sources, lessonIds, problems);
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
  const lessonIds = new Set<string>();
  for (const module of modules) {
    for (const prerequisite of module.prerequisites) {
      if (!nodeIds.has(prerequisite)) {
        problems.push(`module "${module.id}": unknown prerequisite "${prerequisite}"`);
      }
    }
    const titles = module.lessons.map((lesson) => lesson.title);
    for (const title of module.comingLater ?? []) {
      if (titles.includes(title)) {
        problems.push(`module "${module.id}": "${title}" is built and also listed as coming later`);
      }
    }
    if (duplicates([...titles, ...(module.comingLater ?? [])])) {
      problems.push(`module "${module.id}": two lessons share a title`);
    }

    for (const lesson of module.lessons) {
      const where = `lesson "${lesson.id}"`;
      if (lessonIds.has(lesson.id)) problems.push(`${where} is defined twice`);
      lessonIds.add(lesson.id);
      checkLesson(lesson, where, module, registries, nodeIds, problems);
    }
  }
  return lessonIds;
}

function checkLesson(
  lesson: Lesson,
  where: string,
  module: Module,
  registries: ContentRegistries,
  nodeIds: Set<string>,
  problems: string[],
): void {
  const model = registries.models[lesson.model];
  if (model === undefined) {
    problems.push(`${where}: unknown model "${lesson.model}"`);
    return;
  }
  for (const control of lesson.controls) {
    if (!Object.hasOwn(model.controls, control)) {
      problems.push(`${where}: model "${model.id}" has no control "${control}"`);
    }
  }
  for (const overlay of lesson.overlays) {
    if (!Object.hasOwn(registries.overlays, overlay)) {
      problems.push(`${where}: unknown overlay "${overlay}"`);
    }
  }
  for (const label of lesson.steps.look.labels ?? []) {
    if (model.anchors?.[label.anchor] === undefined) {
      problems.push(
        `${where}: a Look label pins to "${label.anchor}", which the model does not have`,
      );
    }
  }

  const { predict } = lesson.steps.try;
  if (predict !== undefined && duplicates(predict.choices.map((choice) => choice.id))) {
    problems.push(`${where}: two prediction choices share an id`);
  }
  const { why } = lesson.steps;
  if (why?.overlay !== undefined && !lesson.overlays.includes(why.overlay)) {
    problems.push(`${where}: the Why turns on "${why.overlay}", which the lesson does not list`);
  }
  if (lesson.recall !== undefined && duplicates(lesson.recall.map((card) => card.id))) {
    problems.push(`${where}: two recall cards share an id`);
  }

  if (lesson.kind === 'model') {
    for (const { instrument, reading } of lesson.instruments) {
      const info = registries.instruments[instrument];
      if (info === undefined) {
        problems.push(`${where}: unknown instrument "${instrument}"`);
      } else if (!module.numbers && info.showsNumbers) {
        problems.push(`${where}: "${instrument}" shows numbers, and ${module.title} has none`);
      }
      if (!Object.hasOwn(model.readings, reading)) {
        problems.push(`${where}: model "${model.id}" has no reading "${reading}"`);
      }
    }
    const { pattern, world } = lesson.steps;
    if (pattern !== undefined) {
      if (!module.numbers) {
        problems.push(`${where}: ${module.title} has no Pattern steps (it shows no numbers)`);
      }
      if (!lesson.controls.includes(pattern.control)) {
        problems.push(`${where}: the Pattern varies "${pattern.control}", which is not exposed`);
      }
      if (!Object.hasOwn(model.readings, pattern.reading)) {
        problems.push(`${where}: model "${model.id}" has no reading "${pattern.reading}"`);
      }
    }
    for (const item of world?.items ?? []) {
      if (item.module !== undefined && !nodeIds.has(item.module)) {
        problems.push(`${where}: In the world points to unknown module "${item.module}"`);
      }
    }
  } else {
    const modelParts = (model.parts ?? []).map((part) => part.id);
    if (modelParts.length === 0) {
      problems.push(`${where}: an explorer needs a model with parts, and "${model.id}" has none`);
    }
    const described = lesson.parts.map((part) => part.part);
    for (const part of described) {
      if (!modelParts.includes(part)) {
        problems.push(
          `${where}: describes part "${part}", which model "${model.id}" does not have`,
        );
      }
    }
    for (const part of modelParts) {
      const count = described.filter((candidate) => candidate === part).length;
      if (count !== 1) {
        problems.push(`${where}: part "${part}" is described ${count} times; describe it once`);
      }
    }
    if (removableParts(model).length === 0 && modelParts.length > 0) {
      problems.push(`${where}: model "${model.id}" has no part that comes off`);
    }
  }

  if (!module.numbers) {
    for (const copy of lessonCopy(lesson)) {
      if (/\d/.test(copy)) {
        problems.push(
          `${where}: ${module.title} shows no numbers, but its copy has a digit: "${copy}"`,
        );
      }
    }
  }
}

/** Everything a learner reads in a lesson. */
function lessonCopy(lesson: Lesson): string[] {
  const { look, why } = lesson.steps;
  const tried = lesson.steps.try;
  const copy = [
    lesson.title,
    look.text,
    ...(look.labels ?? []).map((label) => label.text),
    ...(tried.predict === undefined
      ? []
      : [tried.predict.question, ...tried.predict.choices.map((choice) => choice.label)]),
    ...tried.prompts.map((prompt) => prompt.text),
    ...(why === undefined ? [] : [why.observation ?? '', why.explanation]),
    ...(lesson.recall ?? []).flatMap((card) => [card.prompt, card.answer]),
  ];
  if (lesson.kind === 'model') {
    const { pattern, world, challenge } = lesson.steps;
    if (pattern !== undefined) copy.push(pattern.instruction, pattern.statement);
    copy.push(...(world?.items ?? []).map((item) => item.text));
    if (challenge !== undefined) copy.push(challenge.goal);
  } else {
    for (const part of lesson.parts) {
      copy.push(part.name, part.description, part.explanation ?? '');
    }
  }
  return copy.filter((value) => value !== '');
}

function checkGlossary(
  { glossary, modules }: ContentSources,
  lessonIds: Set<string>,
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
    for (const lesson of module.lessons) {
      for (const termId of lesson.steps.why?.names ?? []) {
        if (!termIds.has(termId)) {
          problems.push(`lesson "${lesson.id}": the Why names unknown term "${termId}"`);
        }
        namedIn.set(termId, [...(namedIn.get(termId) ?? []), lesson.id]);
      }
    }
  }

  for (const term of glossary.terms) {
    for (const related of term.related) {
      if (!termIds.has(related))
        problems.push(`term "${term.id}": unknown related term "${related}"`);
    }
    if (!lessonIds.has(term.introducedIn)) {
      problems.push(`term "${term.id}": introduced in unknown lesson "${term.introducedIn}"`);
    }
    const places = namedIn.get(term.id) ?? [];
    if (places.length !== 1) {
      problems.push(
        `term "${term.id}" is named in ${places.length} Why steps; name it in exactly one`,
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
