import type { ModelLesson } from '@/engine/content/schema';
import {
  clipStuck,
  filingsBench,
  filingsSettled,
  magnetPassed,
  type FilingsBenchSnapshot,
} from '@/models/filings-bench/definition';

// Lesson 3, one idea: magnets pull iron and steel but not copper or wood, and iron filings,
// being iron, show the shape of the field around a magnet. Sliding the magnet is already known
// from lesson 2; sprinkling the filings is the one new control.

export const theInvisibleField = {
  kind: 'model',
  id: 'the-invisible-field',
  title: 'The invisible field',
  model: filingsBench.id,
  controls: ['position', 'filings'],
  instruments: [],
  overlays: ['field-lines'],
  steps: {
    look: {
      text: 'At the front of the bench, your bar magnet lies against a wooden guide, so it slides from side to side. In front of it lie a wooden peg, a copper coin and a steel paper clip. At the back, a second bar magnet lies under a sheet of glass. You can drag your magnet, or use the slider on the right.',
      labels: [
        { anchor: 'magnet', text: 'Your magnet' },
        { anchor: 'peg', text: 'Wooden peg' },
        { anchor: 'coin', text: 'Copper coin' },
        { anchor: 'clip', text: 'Steel paper clip' },
        { anchor: 'glass', text: 'Magnet under glass' },
      ],
    },
    try: {
      predict: {
        question:
          'Your magnet will slide past the wooden peg, the copper coin and the steel paper clip. Which of them will it pull?',
        choices: [
          { id: 'all', label: 'All three' },
          { id: 'metals', label: 'The coin and the paper clip' },
          { id: 'clip', label: 'Only the paper clip' },
          { id: 'none', label: 'None of them' },
        ],
        answer: 'clip',
      },
      prompts: [
        {
          text: 'Slide your magnet slowly past the peg, the coin and the paper clip.',
          doneWhen: (snapshot: FilingsBenchSnapshot) =>
            magnetPassed(snapshot.state, 'peg') &&
            magnetPassed(snapshot.state, 'coin') &&
            clipStuck(snapshot.state),
        },
        {
          text: 'Sprinkle iron filings on the glass, and watch them settle.',
          doneWhen: (snapshot: FilingsBenchSnapshot) => filingsSettled(snapshot.state),
        },
      ],
    },
    why: {
      observation:
        'Only the paper clip moved: it slid across and stuck to your magnet. The peg and the coin stayed put. On the glass, the filings lined up in curves running from one end of the magnet to the other, crowded at the ends.',
      explanation:
        'Iron and steel are ferromagnetic: near a magnet they become magnets themselves, so they are pulled. Copper and wood are not, so they are not pulled at all. The space around a magnet where it pushes and pulls is its magnetic field. Each filing becomes a tiny magnet and turns along the field where it lies. Together they trace field lines, which run from the north pole round to the south pole and crowd together where the field is strongest.',
      names: ['ferromagnetic', 'magnetic-field', 'field-lines'],
      overlay: 'field-lines',
    },
    world: {
      items: [
        {
          text: 'Recycling plants lift steel cans out of the rubbish with big magnets. Aluminium cans and paper are left behind.',
        },
        {
          text: 'A fridge magnet holds on to a steel fridge door, but slides off a wooden cupboard.',
        },
        {
          text: 'Magnetic sweepers pick up dropped nails and screws from a workshop floor.',
        },
      ],
    },
  },
  recall: [
    {
      id: 'what-a-magnet-pulls',
      kind: 'concept',
      prompt: 'Which does a magnet pull: a wooden peg, a copper coin or a steel paper clip?',
      answer:
        'Only the steel paper clip. Iron and steel are ferromagnetic; copper and wood are not.',
    },
    {
      id: 'name-the-space-around',
      kind: 'term',
      prompt: 'What is the space around a magnet, where it pushes and pulls, called?',
      answer: 'Its magnetic field.',
    },
    {
      id: 'what-filings-show',
      kind: 'concept',
      prompt: 'What do iron filings show when they are sprinkled around a magnet?',
      answer:
        'Field lines: curves running from the north pole round to the south pole, crowded where the field is strongest, near the poles.',
    },
  ],
} satisfies ModelLesson;
