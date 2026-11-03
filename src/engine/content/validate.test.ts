import { describe, expect, it } from 'vitest';
import { content } from '@content/index';
import { instruments } from '@/instruments/registry';
import { models } from '@/models/registry';
import { overlays } from '@/overlays/catalog';
import type { ContentSources, ExplorerLesson, Module, ModelLesson } from './schema';
import { validateContent } from './validate';

const registries = { models, overlays, instruments };

/** A deep copy that keeps functions (prompt and challenge conditions) intact. */
function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item: unknown) => clone(item)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) as T;
  }
  return value;
}

interface Target {
  readonly sources: ContentSources;
  readonly module: Module;
  /** Lesson 2: a model lesson. */
  readonly magnets: ModelLesson;
  /** Lesson 1: an explorer. */
  readonly windmill: ExplorerLesson;
}

/** Copies the real content, applies a change, and returns what validation reports. */
function problemsAfter(change: (target: Target) => void) {
  const sources = clone(content);
  const module = sources.modules[0];
  const windmill = module?.lessons.find((lesson) => lesson.kind === 'explorer');
  const magnets = module?.lessons.find((lesson) => lesson.kind === 'model');
  if (module === undefined || windmill === undefined || magnets === undefined) {
    throw new Error('expected an explorer and a model lesson to change');
  }
  change({ sources, module, magnets, windmill });
  return validateContent(sources, registries);
}

function expectProblem(problems: string[], fragment: string) {
  expect(
    problems.some((problem) => problem.includes(fragment)),
    problems.join('\n'),
  ).toBe(true);
}

describe('validateContent', () => {
  it('passes the real content', () => {
    expect(validateContent(content, registries)).toEqual([]);
  });

  describe('lesson references', () => {
    it('rejects an unknown model', () => {
      expectProblem(
        problemsAfter(({ magnets }) => (magnets.model = 'no-such-model')),
        'unknown model',
      );
    });

    it('rejects a control the model does not have', () => {
      expectProblem(
        problemsAfter(({ magnets }) => magnets.controls.push('noSuchControl')),
        'no control',
      );
    });

    it('rejects an unknown instrument or reading', () => {
      expectProblem(
        problemsAfter(({ magnets }) =>
          magnets.instruments.push({ instrument: 'voltmeter', reading: 'volts' }),
        ),
        'unknown instrument',
      );
      expectProblem(
        problemsAfter(({ magnets }) =>
          magnets.instruments.push({ instrument: 'voltmeter', reading: 'volts' }),
        ),
        'no reading',
      );
    });

    it('rejects an unknown overlay, and a Why overlay the lesson does not list', () => {
      expectProblem(
        problemsAfter(({ magnets }) => magnets.overlays.push('no-such-overlay')),
        'unknown overlay',
      );
      expectProblem(
        problemsAfter(({ magnets }) => (magnets.steps.why.overlay = 'field-arrows')),
        'does not list',
      );
    });

    it('rejects a Look label pinned to a point the model does not have', () => {
      expectProblem(
        problemsAfter(({ magnets }) =>
          magnets.steps.look.labels?.push({ anchor: 'nowhere', text: 'Somewhere' }),
        ),
        'a Look label pins to "nowhere"',
      );
    });

    it('rejects a duplicate lesson id', () => {
      expectProblem(
        problemsAfter(({ module, magnets }) => module.lessons.push(clone(magnets))),
        'defined twice',
      );
    });
  });

  describe('lesson shape', () => {
    it('rejects a prediction answer that is not one of the choices', () => {
      expectProblem(
        problemsAfter(({ magnets }) => {
          if (magnets.steps.try.predict) magnets.steps.try.predict.answer = 'maybe';
        }),
        'answer must be one of the choices',
      );
    });

    it('needs two to four guided prompts', () => {
      expectProblem(
        problemsAfter(
          ({ magnets }) => (magnets.steps.try.prompts = magnets.steps.try.prompts.slice(0, 1)),
        ),
        'steps.try.prompts',
      );
    });

    it('keeps a Why explanation to about 80 words', () => {
      expectProblem(
        problemsAfter(({ magnets }) => (magnets.steps.why.explanation = 'word '.repeat(81))),
        'about 80 words',
      );
    });

    it('keeps an explorer part description to one line', () => {
      expectProblem(
        problemsAfter(({ windmill }) => {
          const [first] = windmill.parts;
          if (first !== undefined) first.description = 'word '.repeat(21);
        }),
        'one line',
      );
    });

    it('rejects an em dash in any learner-facing text', () => {
      expectProblem(
        problemsAfter(({ magnets }) => (magnets.steps.look.text = 'A rail — and two carts.')),
        'em dash',
      );
    });
  });

  describe('a module without numbers', () => {
    const pattern = {
      instruction: 'Slide the magnet.',
      control: 'position',
      reading: 'gap',
      statement: 'Closer means stronger.',
    };

    it('rejects a Pattern step', () => {
      expectProblem(
        problemsAfter(({ magnets }) => (magnets.steps.pattern = pattern)),
        'has no Pattern steps',
      );
    });

    it('rejects an instrument that shows numbers', () => {
      expectProblem(
        problemsAfter(({ magnets }) =>
          magnets.instruments.push({ instrument: 'ammeter', reading: 'current' }),
        ),
        'shows numbers',
      );
    });

    it('rejects a digit in lesson copy', () => {
      expectProblem(
        problemsAfter(({ magnets }) => (magnets.steps.look.text = 'A rail with 2 carts.')),
        'has a digit',
      );
      expectProblem(
        problemsAfter(({ windmill }) => {
          const [first] = windmill.parts;
          if (first !== undefined) first.description = 'Three blades, 40 m long.';
        }),
        'has a digit',
      );
    });

    it('allows a Pattern in a module with numbers, checking its control', () => {
      const problems = problemsAfter(({ module, magnets }) => {
        module.numbers = true;
        magnets.steps.pattern = { ...pattern, control: 'notExposed' };
      });
      expect(problems.some((problem) => problem.includes('has no Pattern steps'))).toBe(false);
      expectProblem(problems, 'not exposed');
    });
  });

  describe('explorer lessons', () => {
    it('needs every part of the model described exactly once, and no others', () => {
      expectProblem(
        problemsAfter(({ windmill }) => (windmill.parts = windmill.parts.slice(1))),
        'part "blades" is described 0 times',
      );
      expectProblem(
        problemsAfter(({ windmill }) => {
          const [first] = windmill.parts;
          if (first !== undefined) windmill.parts.push(clone(first));
        }),
        'part "blades" is described 2 times',
      );
      expectProblem(
        problemsAfter(({ windmill }) =>
          windmill.parts.push({ part: 'propeller', name: 'Propeller', description: 'Spins.' }),
        ),
        'describes part "propeller"',
      );
    });

    it('needs a model with parts', () => {
      expectProblem(
        problemsAfter(({ windmill }) => {
          windmill.model = 'magnet-rail';
          windmill.controls = [];
        }),
        'needs a model with parts',
      );
    });
  });

  describe('module', () => {
    it('rejects a coming-later title that is already built', () => {
      expectProblem(
        problemsAfter(({ module }) => module.comingLater?.push('What magnets do')),
        'built and also listed as coming later',
      );
    });
  });

  describe('glossary', () => {
    it('keeps definitions under 25 words', () => {
      expectProblem(
        problemsAfter(({ sources }) => {
          const [first] = sources.glossary.terms;
          if (first !== undefined) first.definition = 'word '.repeat(25);
        }),
        'under 25 words',
      );
    });

    it('needs every term named in exactly one Why', () => {
      expectProblem(
        problemsAfter(({ magnets }) => (magnets.steps.why.names = ['magnetic-pole'])),
        'named in 0 Why steps',
      );
      expectProblem(
        problemsAfter(({ module, magnets }) => {
          const copy = clone(magnets);
          copy.id = 'second-lesson';
          copy.title = 'A second lesson';
          module.lessons.push(copy);
        }),
        'named in 2 Why steps',
      );
    });

    it('needs introducedIn to match the Why that names the term', () => {
      expectProblem(
        problemsAfter(({ magnets, windmill }) => {
          magnets.steps.why.names = ['magnetic-pole', 'attraction'];
          if (windmill.steps.why) windmill.steps.why.names = ['repulsion'];
        }),
        'says it is introduced in',
      );
    });

    it('rejects two terms that match the same text', () => {
      expectProblem(
        problemsAfter(({ sources }) => sources.glossary.terms[1]?.forms.push('Magnetic Pole')),
        'both match the text',
      );
    });
  });

  describe('map', () => {
    it('needs a module file for every available node, with a matching title', () => {
      expectProblem(
        problemsAfter(({ sources }) => {
          const motor = sources.moduleMap.nodes.find((node) => node.moduleId === 'motor');
          if (motor !== undefined) motor.status = 'available';
        }),
        'has no module file',
      );
      expectProblem(
        problemsAfter(({ sources }) => {
          const [first] = sources.moduleMap.nodes;
          if (first !== undefined) first.title = 'Something else';
        }),
        'its module file says',
      );
    });

    it('needs prerequisites to match the arrows, and arrows to known modules', () => {
      expectProblem(
        problemsAfter(({ module }) => module.prerequisites.push('magnetism')),
        'prerequisites must match',
      );
      expectProblem(
        problemsAfter(({ sources }) => sources.moduleMap.nodes[1]?.builtOn.push('astronomy')),
        'unknown module "astronomy"',
      );
    });
  });
});
