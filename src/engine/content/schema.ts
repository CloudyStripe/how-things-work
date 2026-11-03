import { z } from 'zod';
import type { SimSnapshot } from '@/models/types';

// The shape of every content file. Content files are typed against these schemas, and
// validate.ts checks them at load (and in the test suite) together with the cross-references
// between files.

/** Content ids are lowercase words joined by hyphens. */
const contentId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'Use lowercase words joined by hyphens' });

/** Model control and reading ids are camelCase, as in the model definition. */
const modelKey = z.string().regex(/^[a-z][a-zA-Z0-9]*$/, { error: 'Use a camelCase model key' });

const text = z.string().trim().min(1);

export function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

/**
 * A condition on simulation state, checked every frame. Method syntax keeps the parameter
 * bivariant, so a content file can type it with its own model's snapshot.
 */
type Predicate = { check(snapshot: SimSnapshot<unknown>): boolean }['check'];
const predicate = z.custom<Predicate>((value) => typeof value === 'function', {
  error: 'Expected a function of simulation state',
});

/** The eight steps every experiment runs, in order. Pattern is the only optional one. */
export const STEP_KINDS = [
  'hook',
  'predict',
  'explore',
  'reveal',
  'pattern',
  'world',
  'challenge',
  'recall',
] as const;
export type StepKind = (typeof STEP_KINDS)[number];

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

export const experimentSchema = z.object({
  id: contentId,
  title: text,
  model: contentId,
  /** The model's controls this experiment exposes, in display order. */
  controls: z.array(modelKey).min(1),
  instruments: z.array(z.object({ instrument: contentId, reading: modelKey })),
  overlays: z.array(contentId),
  steps: z.object({
    hook: z.object({ text }),
    predict: predictStep,
    explore: z.object({
      prompts: z
        .array(z.object({ text, doneWhen: predicate.optional() }))
        .min(2)
        .max(4),
    }),
    reveal: z.object({
      observation: text,
      explanation: text.refine((value) => wordCount(value) <= 80, {
        error: 'Keep a Reveal explanation to about 80 words',
      }),
      /** Terms named here. Each term is named in exactly one Reveal. */
      names: z.array(contentId).min(1),
      /** The overlay the Reveal turns on. */
      overlay: contentId.optional(),
    }),
    pattern: z
      .object({
        /** What to do, such as which other controls to set first. */
        instruction: text,
        /** The one control the learner varies; each new setting logs a row. */
        control: modelKey,
        reading: modelKey,
        /** The pattern in words, shown once the table has two rows. */
        statement: text,
      })
      .optional(),
    world: z.object({
      items: z
        .array(z.object({ text, module: contentId.optional() }))
        .min(2)
        .max(3),
    }),
    challenge: z.object({ goal: text, isMet: predicate }),
    recall: z.object({
      cards: z
        .array(
          z.object({
            id: contentId,
            kind: z.enum(['concept', 'term', 'prediction']),
            prompt: text,
            answer: text,
          }),
        )
        .min(2)
        .max(4),
    }),
  }),
});
export type Experiment = z.infer<typeof experimentSchema>;

export const moduleSchema = z.object({
  id: contentId,
  title: text,
  /** The short real-world intro. */
  hook: text,
  history: z.array(text),
  /** Modules this one builds on. An unfinished one gets a nudge, never a block. */
  prerequisites: z.array(contentId),
  experiments: z.array(experimentSchema).min(1),
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
      /** The experiment whose Reveal names this term. */
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
