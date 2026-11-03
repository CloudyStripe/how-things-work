import { z } from 'zod';
import type { ExplorerView, SimSnapshot } from '@/models/types';

// The shape of every content file. Content files are typed against these schemas, and
// validate.ts checks them at load (and in the test suite) together with the cross-references
// between files.

/** Content ids are lowercase words joined by hyphens. */
const contentId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'Use lowercase words joined by hyphens' });

/** Model control, reading, anchor and part ids are camelCase, as in the model definition. */
const modelKey = z.string().regex(/^[a-z][a-zA-Z0-9]*$/, { error: 'Use a camelCase model key' });

const text = z.string().trim().min(1);

export function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function upToWords(limit: number, error: string) {
  return text.refine((value) => wordCount(value) <= limit, { error });
}

/**
 * A condition on simulation state (and, for an explorer, on how the learner has taken the
 * model apart), checked every frame. Method syntax keeps the parameters bivariant, so a content
 * file can type the snapshot with its own model's.
 */
type Predicate = { check(snapshot: SimSnapshot<unknown>, view: ExplorerView): boolean }['check'];
const predicate = z.custom<Predicate>((value) => typeof value === 'function', {
  error: 'Expected a function of simulation state',
});

/**
 * The steps a lesson can run, in order. Look, Try and Why are always there (Why is optional in
 * an explorer); Pattern, In the world and Challenge are optional.
 */
export const STEP_KINDS = ['look', 'try', 'why', 'pattern', 'world', 'challenge'] as const;
export type StepKind = (typeof STEP_KINDS)[number];

const lookStep = z.object({
  /** What the learner is looking at, in plain words. */
  text,
  /** Labels pinned to the model during Look; each names an anchor the model defines. */
  labels: z.array(z.object({ anchor: modelKey, text })).optional(),
});

const predictStep = z
  .object({
    question: text,
    choices: z
      .array(z.object({ id: contentId, label: text }))
      .min(2)
      .max(5),
    /** The id of the choice that matches what the model does. */
    answer: contentId,
  })
  .refine((step) => step.choices.some((choice) => choice.id === step.answer), {
    error: 'The answer must be one of the choices',
    path: ['answer'],
  });

const tryStep = z.object({
  /** Asked first, only where it helps. The controls unlock once it is answered. */
  predict: predictStep.optional(),
  prompts: z
    .array(z.object({ text, doneWhen: predicate.optional() }))
    .min(2)
    .max(4),
});

const whyStep = z.object({
  /** What happened, in a sentence or two. */
  observation: text.optional(),
  explanation: upToWords(80, 'Keep a Why explanation to about 80 words'),
  /** Terms named here. Each term is named in exactly one Why. */
  names: z.array(contentId),
  /** The overlay the Why turns on. */
  overlay: contentId.optional(),
});

const patternStep = z.object({
  /** What to do, such as which other controls to set first. */
  instruction: text,
  /** The one control the learner varies; each new setting logs a row. */
  control: modelKey,
  reading: modelKey,
  /** The pattern in words, shown once the table has two rows. */
  statement: text,
});

const worldStep = z.object({
  items: z
    .array(z.object({ text, module: contentId.optional() }))
    .min(2)
    .max(3),
});

const challengeStep = z.object({ goal: text, isMet: predicate });

/** Review cards, queued quietly when the learner finishes the lesson. */
const recallCards = z
  .array(
    z.object({
      id: contentId,
      kind: z.enum(['concept', 'term', 'prediction']),
      prompt: text,
      answer: text,
    }),
  )
  .min(2)
  .max(4);

/** A lesson around one interactive model: Look, Try, Why, then any optional steps. */
export const modelLessonSchema = z.object({
  kind: z.literal('model'),
  id: contentId,
  title: text,
  model: contentId,
  /** The model's controls this lesson exposes, in display order. */
  controls: z.array(modelKey).min(1),
  instruments: z.array(z.object({ instrument: contentId, reading: modelKey })),
  overlays: z.array(contentId),
  steps: z.object({
    look: lookStep,
    try: tryStep,
    why: whyStep,
    pattern: patternStep.optional(),
    world: worldStep.optional(),
    challenge: challengeStep.optional(),
  }),
  recall: recallCards,
});
export type ModelLesson = z.infer<typeof modelLessonSchema>;

/** A machine the learner takes apart: Look, Try, then an optional Why. */
export const explorerLessonSchema = z.object({
  kind: z.literal('explorer'),
  id: contentId,
  title: text,
  model: contentId,
  /** The model's own controls, such as the wind. The take-apart tools are not controls. */
  controls: z.array(modelKey),
  overlays: z.array(contentId),
  /** What each of the model's parts is called and what it does. */
  parts: z
    .array(
      z.object({
        part: modelKey,
        name: text,
        description: upToWords(20, 'Keep a part description to one line (20 words)'),
        /** A fuller explanation, for a lesson that explains the machine. */
        explanation: upToWords(80, 'Keep a part explanation to about 80 words').optional(),
      }),
    )
    .min(1),
  steps: z.object({
    look: lookStep,
    try: tryStep,
    why: whyStep.optional(),
  }),
  recall: recallCards.optional(),
});
export type ExplorerLesson = z.infer<typeof explorerLessonSchema>;

export const lessonSchema = z.discriminatedUnion('kind', [modelLessonSchema, explorerLessonSchema]);
export type Lesson = z.infer<typeof lessonSchema>;
export type LessonPrompt = Lesson['steps']['try']['prompts'][number];
export type WhyStep = z.infer<typeof whyStep>;
export type PatternStep = z.infer<typeof patternStep>;
export type RecallCard = z.infer<typeof recallCards>[number];

export const moduleSchema = z.object({
  id: contentId,
  title: text,
  /** The short real-world intro. */
  hook: text,
  history: z.array(text),
  /** Modules this one builds on. An unfinished one gets a nudge, never a block. */
  prerequisites: z.array(contentId),
  /**
   * False for a qualitative module: no Pattern steps, no instruments that show numbers, and no
   * digits in lesson copy.
   */
  numbers: z.boolean(),
  lessons: z.array(lessonSchema).min(1),
  /** Titles of the lessons still to be built, listed after the built ones. */
  comingLater: z.array(text).optional(),
});
export type Module = z.infer<typeof moduleSchema>;

export const moduleMapSchema = z.object({
  nodes: z
    .array(
      z.object({
        moduleId: contentId,
        title: text,
        status: z.enum(['available', 'coming-later']),
        row: z.int().min(0),
        column: z.int().min(0),
        /** Modules this one builds on; the map draws an arrow from each. */
        builtOn: z.array(contentId),
      }),
    )
    .min(1),
});
export type ModuleMap = z.infer<typeof moduleMapSchema>;
export type MapNode = ModuleMap['nodes'][number];

export const glossarySchema = z.object({
  terms: z.array(
    z.object({
      id: contentId,
      name: text,
      /** Other forms that count as this term in text, such as plurals. */
      forms: z.array(text),
      definition: text.refine((value) => wordCount(value) < 25, {
        error: 'Keep a definition under 25 words',
      }),
      note: text,
      related: z.array(contentId),
      /** The lesson whose Why names this term. */
      introducedIn: contentId,
    }),
  ),
  /** Terms easily mixed up; the glossary shows each pair side by side. */
  confusablePairs: z.array(z.tuple([contentId, contentId])),
});
export type Glossary = z.infer<typeof glossarySchema>;
export type Term = Glossary['terms'][number];

/** All content, as `content/index.ts` hands it to the engine. */
export interface ContentSources {
  readonly moduleMap: ModuleMap;
  readonly glossary: Glossary;
  readonly modules: readonly Module[];
}
