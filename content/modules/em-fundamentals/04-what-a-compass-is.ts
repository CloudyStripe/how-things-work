import type { ModelLesson } from '@/engine/content/schema';
import {
  besideNorthPole,
  besideSouthPole,
  compassBench,
  farAndPointingNorth,
  type CompassBenchSnapshot,
} from '@/models/compass-bench/definition';

// Lesson 4, one idea: a compass is a small magnet on a pivot that lines up with the field where
// it sits; alone, it lines up with Earth's. Moving the compass is the one new control.

export const whatACompassIs = {
  kind: 'model',
  id: 'what-a-compass-is',
  title: 'What a compass is',
  model: compassBench.id,
  controls: ['compass'],
  instruments: [],
  overlays: ['field-lines', 'earth-field'],
  steps: {
    look: {
      text: 'This is a compass on a bench, with a bar magnet lying to the left. The compass needle is a thin magnet balanced on a pivot, free to turn: its red end is its north pole and its blue end its south pole. The arrow on the bench points north, away from you. Out here, away from the magnet, the needle points north too. You can drag the compass anywhere on the bench, or use the sliders on the right.',
      labels: [
        { anchor: 'magnet', text: 'Bar magnet' },
        { anchor: 'compass', text: 'Compass' },
        { anchor: 'north', text: 'North' },
      ],
    },
    try: {
      predict: {
        question:
          "When you bring the compass to your magnet's red end, which way will the needle's red end point?",
        choices: [
          { id: 'toward', label: 'Toward the magnet' },
          { id: 'away', label: 'Away from the magnet' },
          { id: 'north', label: 'Still north' },
        ],
        answer: 'away',
      },
      prompts: [
        {
          text: "Drag the compass to the magnet's red end.",
          doneWhen: (snapshot: CompassBenchSnapshot) => besideNorthPole(snapshot.state),
        },
        {
          text: 'Now take it round to the blue end.',
          doneWhen: (snapshot: CompassBenchSnapshot) => besideSouthPole(snapshot.state),
        },
        {
          text: 'Move the compass far from the magnet again, and watch where the needle settles.',
          doneWhen: (snapshot: CompassBenchSnapshot) =>
            (snapshot.state.visitedNorth || snapshot.state.visitedSouth) &&
            farAndPointingNorth(snapshot.state),
        },
      ],
    },
    why: {
      observation:
        "At the magnet's red end the needle's red end pointed away from the magnet; at the blue end it pointed toward it. Far away, it swung back to north.",
      explanation:
        "A compass is a small magnet on a pivot. Wherever it sits, the needle turns to line up with the magnetic field there, its north end pointing along the field lines. Near your magnet, your magnet's field is strongest, so the needle follows it: away from the north pole and toward the south pole. Far away, your magnet's field is too weak to matter, and the needle lines up with Earth's magnetic field, which runs north across the planet.",
      names: ['compass', 'earths-magnetic-field'],
      overlay: 'earth-field',
    },
    world: {
      items: [
        {
          text: 'Hikers and sailors find their way with a compass, which points north wherever they go.',
        },
        {
          text: "Phones find north with a tiny sensor that measures Earth's magnetic field.",
        },
        {
          text: "Keep a compass away from magnets and steel: a laptop's speaker magnet can turn the needle away from north.",
        },
      ],
    },
  },
  recall: [
    {
      id: 'what-a-compass-is',
      kind: 'term',
      prompt: 'What is a compass?',
      answer: 'A small magnet on a pivot that lines up with the magnetic field where it sits.',
    },
    {
      id: 'compass-at-north-pole',
      kind: 'prediction',
      prompt: "Near a magnet's north pole, which way does a compass needle's north end point?",
      answer: 'Away from the magnet: like poles repel.',
    },
    {
      id: 'why-north',
      kind: 'concept',
      prompt: 'Far from any magnet, why does a compass point north?',
      answer: "It lines up with Earth's magnetic field, which runs north across the planet.",
    },
  ],
} satisfies ModelLesson;
