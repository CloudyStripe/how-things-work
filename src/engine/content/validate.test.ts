import { describe, expect, it } from 'vitest';
import { content } from '@content/index';
import { instruments } from '@/instruments/registry';
import { models } from '@/models/registry';
import { overlays } from '@/overlays/catalog';
import type { ContentSources, Experiment } from './schema';
import { validateContent } from './validate';

const registries = { models, overlays, instruments };

/** A deep copy that keeps functions (challenge conditions) intact. */
function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item: unknown) => clone(item)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) as T;
  }
  return value;
}

/** Copies the real content, applies a change, and returns what validation reports. */
function problemsAfter(change: (sources: ContentSources, experiment: Experiment) => void) {
  const sources = clone(content);
  const experiment = sources.modules[0]?.experiments[0];
  if (experiment === undefined) throw new Error('no experiment to change');
  change(sources, experiment);
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

  describe('experiment references', () => {
    it('rejects an unknown model', () => {
      expectProblem(
        problemsAfter((_, e) => (e.model = 'no-such-model')),
        'unknown model',
      );
    });

    it('rejects a control the model does not have', () => {
      expectProblem(
        problemsAfter((_, e) => e.controls.push('noSuchControl')),
        'no control',
      );
    });

    it('rejects an unknown instrument or reading', () => {
      expectProblem(
        problemsAfter((_, e) =>
          e.instruments.push({ instrument: 'voltmeter', reading: 'current' }),
        ),
        'unknown instrument',
      );
      expectProblem(
        problemsAfter((_, e) => e.instruments.push({ instrument: 'ammeter', reading: 'volts' })),
        'no reading',
      );
    });

    it('rejects an unknown overlay, and a Reveal overlay the experiment does not list', () => {
      expectProblem(
        problemsAfter((_, e) => e.overlays.push('no-such-overlay')),
        'unknown overlay',
      );
      expectProblem(
        problemsAfter((_, e) => (e.overlays = [])),
        'does not list',
      );
    });

    it('rejects a Pattern that varies a control the experiment does not expose', () => {
      expectProblem(
        problemsAfter((_, e) => (e.controls = ['switchClosed', 'reversed'])),
        'not exposed',
      );
    });

    it('rejects a duplicate experiment id', () => {
      expectProblem(
        problemsAfter((sources, e) => sources.modules[0]?.experiments.push(clone(e))),
        'defined twice',
      );
    });
  });

  describe('experiment shape', () => {
    it('rejects a prediction answer that is not one of the choices', () => {
      expectProblem(
        problemsAfter((_, e) => (e.steps.predict.answer = 'maybe')),
        'answer must be one of the choices',
      );
    });

    it('needs two to four guided prompts', () => {
      expectProblem(
        problemsAfter((_, e) => (e.steps.explore.prompts = e.steps.explore.prompts.slice(0, 1))),
        'steps.explore.prompts',
      );
    });

    it('keeps a Reveal explanation to about 80 words', () => {
      expectProblem(
        problemsAfter((_, e) => (e.steps.reveal.explanation = 'word '.repeat(81))),
        'about 80 words',
      );
    });

    it('rejects an em dash in any learner-facing text', () => {
      expectProblem(
        problemsAfter((_, e) => (e.steps.hook.text = 'A wire — and a compass.')),
        'em dash',
      );
    });
  });

  describe('glossary', () => {
    it('keeps definitions under 25 words', () => {
      expectProblem(
        problemsAfter((sources) => {
          const [first] = sources.glossary.terms;
          if (first !== undefined) first.definition = 'word '.repeat(25);
        }),
        'under 25 words',
      );
    });

    it('needs every term named in exactly one Reveal', () => {
      expectProblem(
        problemsAfter((_, e) => (e.steps.reveal.names = ['magnetic-field'])),
        'named in 0 Reveal steps',
      );
      expectProblem(
        problemsAfter((sources, e) => {
          const copy = clone(e);
          copy.id = 'second-experiment';
          sources.modules[0]?.experiments.push(copy);
        }),
        'named in 2 Reveal steps',
      );
    });

    it('needs introducedIn to match the Reveal that names the term', () => {
      expectProblem(
        problemsAfter((sources, e) => {
          const copy = clone(e);
          copy.id = 'second-experiment';
          copy.steps.reveal.names = ['compass-deflection'];
          e.steps.reveal.names = ['magnetic-field'];
          sources.modules[0]?.experiments.push(copy);
        }),
        'says it is introduced in',
      );
    });

    it('rejects two terms that match the same text', () => {
      expectProblem(
        problemsAfter((sources) => sources.glossary.terms[1]?.forms.push('Magnetic Field')),
        'both match the text',
      );
    });
  });

  describe('map', () => {
    it('needs a module file for every available node, with a matching title', () => {
      expectProblem(
        problemsAfter((sources) => {
          const motor = sources.moduleMap.nodes.find((node) => node.moduleId === 'motor');
          if (motor !== undefined) motor.status = 'available';
        }),
        'has no module file',
      );
      expectProblem(
        problemsAfter((sources) => {
          const [first] = sources.moduleMap.nodes;
          if (first !== undefined) first.title = 'Something else';
        }),
        'its module file says',
      );
    });

    it('needs prerequisites to match the arrows, and arrows to known modules', () => {
      expectProblem(
        problemsAfter((sources) => sources.modules[0]?.prerequisites.push('magnetism')),
        'prerequisites must match',
      );
      expectProblem(
        problemsAfter((sources) => sources.moduleMap.nodes[1]?.builtOn.push('astronomy')),
        'unknown module "astronomy"',
      );
    });
  });
});
