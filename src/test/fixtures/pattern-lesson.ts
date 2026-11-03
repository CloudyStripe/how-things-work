import type { ContentSources } from '@/engine/content/schema';
import type { ModelDefinition } from '@/models/types';
import { vec3 } from '@/physics';

// A module with numbers, for testing the Pattern step: EM Fundamentals has none, but the
// Magnetism and Electricity modules will.

type DialControls = { readonly level: string };

const OUTPUT: Readonly<Record<string, number>> = { low: 1, medium: 2, high: 4 };

export const dialModel: ModelDefinition<null, DialControls> = {
  id: 'fixture-dial',
  title: 'A dial with three settings',
  controls: {
    level: {
      kind: 'choice',
      label: 'Level',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
      default: 'low',
    },
  },
  createState: () => null,
  step: () => null,
  readings: {
    output: {
      label: 'Output',
      unit: 'mT',
      scale: 1e3,
      digits: 1,
      read: ({ controls }) => (OUTPUT[controls.level] ?? 0) * 1e-3,
    },
  },
  fieldSources: () => ({ wires: [], earth: false }),
  overlayRegion: { center: vec3(0, 0, 0), halfWidth: 0.1 },
};

export const patternContent: ContentSources = {
  moduleMap: {
    nodes: [
      {
        moduleId: 'fixture',
        title: 'Fixture',
        status: 'available',
        row: 0,
        column: 0,
        builtOn: [],
      },
    ],
  },
  glossary: {
    terms: [
      {
        id: 'output',
        name: 'output',
        forms: [],
        definition: 'What the dial gives.',
        note: 'A fixture term.',
        related: [],
        introducedIn: 'dial',
      },
    ],
    confusablePairs: [],
  },
  modules: [
    {
      id: 'fixture',
      title: 'Fixture',
      hook: 'A module with numbers.',
      history: [],
      prerequisites: [],
      numbers: true,
      lessons: [
        {
          kind: 'model',
          id: 'dial',
          title: 'The dial',
          model: 'fixture-dial',
          controls: ['level'],
          instruments: [],
          overlays: [],
          steps: {
            look: { text: 'A dial.' },
            try: { prompts: [{ text: 'Turn it.' }, { text: 'Turn it again.' }] },
            why: { explanation: 'It gives an output.', names: ['output'] },
            pattern: {
              instruction: 'Try each level.',
              control: 'level',
              reading: 'output',
              statement: 'Doubling the level doubles the output.',
            },
          },
          recall: [
            { id: 'a', kind: 'concept', prompt: 'What does it give?', answer: 'An output.' },
            { id: 'b', kind: 'term', prompt: 'What is it called?', answer: 'Output.' },
          ],
        },
      ],
    },
  ],
};
