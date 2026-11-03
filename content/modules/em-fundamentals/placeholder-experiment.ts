import type { Experiment } from '@/engine/content/schema';
import {
  compassSettledBetween,
  placeholderWireCompass,
  type PlaceholderSnapshot,
} from '@/models/placeholder-wire-compass/definition';

// The Phase 3 dummy experiment: it carries the engine through all eight steps around the
// placeholder model. Experiment 1 replaces it in Phase 4.
export const placeholderExperiment = {
  id: 'placeholder-wire-compass',
  title: 'Placeholder: a wire and a compass',
  model: placeholderWireCompass.id,
  controls: ['switchClosed', 'level', 'reversed'],
  instruments: [{ instrument: 'ammeter', reading: 'current' }],
  overlays: ['field-arrows'],
  steps: {
    hook: {
      text: 'A placeholder for Experiment 1. A copper wire runs straight up through a board, and a compass sits on the board beside it.',
    },
    predict: {
      question: 'When you close the switch, what will the compass do?',
      choices: [
        { id: 'nothing', label: 'Nothing' },
        { id: 'turn', label: 'Turn away from north' },
        { id: 'north-harder', label: 'Point north harder' },
      ],
      answer: 'turn',
    },
    explore: {
      prompts: [
        {
          text: 'Close the switch.',
          doneWhen: (snapshot: PlaceholderSnapshot) => snapshot.controls.switchClosed,
        },
        {
          text: 'Raise the current to high.',
          doneWhen: (snapshot: PlaceholderSnapshot) =>
            snapshot.controls.switchClosed && snapshot.controls.level === 'high',
        },
        {
          text: 'Reverse the current and watch the needle swing the other way.',
          doneWhen: (snapshot: PlaceholderSnapshot) =>
            snapshot.controls.switchClosed && snapshot.controls.reversed,
        },
      ],
    },
    reveal: {
      observation:
        'The compass turned away from north as soon as current flowed, and reversing the current turned it the other way.',
      explanation:
        "Current in the wire makes a magnetic field that circles the wire. The needle lines up with that field and Earth's field together, so the compass deflection shows the wire's field at work. More current gives more deflection.",
      names: ['magnetic-field', 'compass-deflection'],
      overlay: 'field-arrows',
    },
    pattern: {
      instruction: 'Close the switch, then try each current level.',
      control: 'level',
      reading: 'wireField',
      statement: 'Doubling the current doubles the field from the wire.',
    },
    world: {
      items: [
        {
          text: 'Every live cable in a house has this field around it while current flows.',
          module: 'electricity',
        },
        {
          text: 'Winding the wire into a coil concentrates the field into an electromagnet.',
          module: 'magnetism',
        },
      ],
    },
    challenge: {
      goal: 'Make the compass point closer to east than to north.',
      isMet: (snapshot: PlaceholderSnapshot) => compassSettledBetween(snapshot.state, 45, 135),
    },
    recall: {
      cards: [
        {
          id: 'why-compass-turns',
          kind: 'concept',
          prompt: 'Why does the compass turn when current flows in the wire?',
          answer:
            "The current makes a magnetic field around the wire, and the needle lines up with it and Earth's field together.",
        },
        {
          id: 'name-deflection',
          kind: 'term',
          prompt: 'What is it called when a compass needle turns away from north?',
          answer: 'Compass deflection.',
        },
      ],
    },
  },
} satisfies Experiment;
