import type { ModelLesson } from '@/engine/content/schema';
import { clipsHeld, coilTray, type CoilTraySnapshot } from '@/models/coil-tray/definition';

// Lesson 7, one idea: a coil gathers the wire's field into a magnet you can switch off, and an
// iron core makes it much stronger. The switch is known from lesson 5; the iron core is the one
// new control.

export const coilIt = {
  kind: 'model',
  id: 'coil-it',
  title: 'Coil it',
  model: coilTray.id,
  controls: ['switch', 'core'],
  instruments: [],
  overlays: ['field-lines', 'current-flow'],
  steps: {
    look: {
      text: "The copper wire is wound into a coil, held over a tray of steel paper clips, with a small compass beside the coil's right-hand end. The battery and switch send current round its turns. In front of the tray lies a rod of soft iron, which can slide into the middle of the coil. You can click the switch and the rod, or use the buttons on the right.",
      labels: [
        { anchor: 'coil', text: 'Coil' },
        { anchor: 'clips', text: 'Paper clips' },
        { anchor: 'compass', text: 'Compass' },
        { anchor: 'core', text: 'Iron rod' },
        { anchor: 'battery', text: 'Battery' },
        { anchor: 'switch', text: 'Switch' },
      ],
    },
    try: {
      predict: {
        question:
          'The iron rod is not a magnet. With current flowing, what will pushing it into the coil do?',
        choices: [
          { id: 'more', label: 'Lift more clips' },
          { id: 'same', label: 'Make no difference' },
          { id: 'fewer', label: 'Lift fewer clips' },
        ],
        answer: 'more',
      },
      prompts: [
        {
          text: 'Close the switch, and watch the compass and the clips.',
          doneWhen: (snapshot: CoilTraySnapshot) => snapshot.state.compassSwung,
        },
        {
          text: 'Push the iron rod into the coil, with the switch closed.',
          doneWhen: (snapshot: CoilTraySnapshot) =>
            snapshot.controls.core && clipsHeld(snapshot.state) >= 3,
        },
        {
          text: 'Open the switch.',
          doneWhen: (snapshot: CoilTraySnapshot) => snapshot.state.droppedAfterCore,
        },
      ],
    },
    why: {
      observation:
        'With the switch closed, the compass by the coil swung round to point away from it, but no clip lifted. With the iron rod in, clips jumped up and clung to both ends. When the switch opened, the clips dropped and the compass swung back to north.',
      explanation:
        'A coil is wire wound in turns: a long one is a solenoid. The circles of field round each turn add up along the middle, so it has a north pole at one end and a south pole at the other, like a bar magnet. Alone it is weak: it turns a compass but lifts no clip. An iron core becomes a magnet and makes the field far stronger. That is an electromagnet: switch it off and the clips drop.',
      names: ['coil', 'solenoid', 'iron-core', 'electromagnet'],
      overlay: 'field-lines',
    },
    world: {
      items: [
        {
          text: 'Scrapyard cranes lift scrap cars with a huge electromagnet, then switch it off to drop them.',
        },
        {
          text: 'Electric door locks hold a steel plate with an electromagnet until the current is cut.',
        },
        {
          text: "A doorbell's electromagnet pulls a small hammer against the bell.",
        },
      ],
    },
  },
  recall: [
    {
      id: 'name-the-switchable-magnet',
      kind: 'term',
      prompt: 'What is a coil with an iron core, a magnet only while current flows, called?',
      answer: 'An electromagnet.',
    },
    {
      id: 'what-the-core-does',
      kind: 'concept',
      prompt: "What does an iron core do to a coil's magnetic field?",
      answer: 'It becomes a magnet itself and makes the field far stronger.',
    },
    {
      id: 'solenoid-poles',
      kind: 'concept',
      prompt: "Where are a solenoid's poles?",
      answer:
        'At its two ends: a north pole at one and a south pole at the other, like a bar magnet.',
    },
  ],
} satisfies ModelLesson;
