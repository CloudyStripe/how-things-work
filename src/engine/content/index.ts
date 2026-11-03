import { content } from '@content/index';
import { instruments } from '@/instruments/registry';
import { models } from '@/models/registry';
import type { AnyModel } from '@/models/types';
import { overlays } from '@/overlays/catalog';
import type { Lesson, Module, Term } from './schema';
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

export function findLesson(module: Module, lessonId: string): Lesson | undefined {
  return module.lessons.find((lesson) => lesson.id === lessonId);
}

/** The model a lesson runs. Validation guarantees it exists. */
export function modelFor(lesson: Lesson): AnyModel {
  const model = models[lesson.model];
  if (model === undefined) throw new Error(`No model "${lesson.model}"`);
  return model;
}

export function findTerm(termId: string): Term | undefined {
  return glossary.terms.find((term) => term.id === termId);
}

/** Where a term is named: the lesson whose Why names it, and its module. */
export function termIntroduction(term: Term): { module: Module; lesson: Lesson } | undefined {
  for (const module of content.modules) {
    const lesson = findLesson(module, term.introducedIn);
    if (lesson !== undefined) return { module, lesson };
  }
  return undefined;
}

/** The terms a module's lessons name, in glossary order. */
export function moduleTerms(module: Module): Term[] {
  const lessonIds = new Set(module.lessons.map((lesson) => lesson.id));
  return glossary.terms.filter((term) => lessonIds.has(term.introducedIn));
}
