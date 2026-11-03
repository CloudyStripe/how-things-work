import type { ModelLesson } from '@/engine/content/schema';
import { crankGenerator, type CrankGeneratorSnapshot } from '@/models/crank-generator/definition';

// Lesson 9, one idea: a magnet spinning past a coil makes current that keeps reversing; that
// machine is a generator. Crank speed is the one new control.

export const spinIt = {
  kind: 'model',
  id: 'spin-it',
  title: 'Spin it',
  model: crankGenerator.id,
  controls: ['crank'],
  instruments: [],
  overlays: ['current-flow'],
  steps: {
    look: {
      text: 'A bar magnet is fixed across an upright shaft, with a crank on top to turn it. Beside it is a coil with an iron rod through its middle, wired to the meter and the red and green lights from the last lesson. You can click the crank to turn it slowly or fast, or use the buttons on the right.',
      labels: [
        { anchor: 'crank', text: 'Crank' },
        { anchor: 'magnet', text: 'Bar magnet' },
        { anchor: 'coil', text: 'Coil' },
        { anchor: 'meter', text: 'Meter' },
        { anchor: 'leds', text: 'Red and green lights' },
      ],
    },
    try: {
      predict: {
        question: 'As the magnet spins, which way will the current in the coil flow?',
        choices: [
          { id: 'one-way', label: 'Always the same way' },
          { id: 'back-and-forth', label: 'One way, then the other, over and over' },
          { id: 'none', label: 'Not at all: the magnet never gets any closer' },
        ],
        answer: 'back-and-forth',
      },
      prompts: [
        {
          text: 'Turn the crank slowly, and watch the meter.',
          doneWhen: (snapshot: CrankGeneratorSnapshot) =>
            snapshot.state.slowSwings.right && snapshot.state.slowSwings.left,
        },
        {
          text: 'Now turn it fast.',
          doneWhen: (snapshot: CrankGeneratorSnapshot) =>
            snapshot.state.fastLit.red && snapshot.state.fastLit.green,
        },
      ],
    },
    why: {
      observation:
        'Turning slowly, the needle swung one way, then the other, again and again. Turning fast, it swung harder and quicker, and the red and green lights took turns flashing.',
      explanation:
        'Spinning the magnet turns its north pole toward the coil, then away, then its south pole toward it, over and over. The flux through the coil keeps growing and shrinking and reversing, so the induced current keeps reversing: an alternating current. A machine that makes current by spinning magnets past coils is a generator. Turn it faster and the flux changes faster: the current is bigger and reverses more often.',
      names: ['alternating-current', 'generator'],
      overlay: 'current-flow',
    },
    world: {
      items: [
        { text: 'A bicycle dynamo spins a magnet beside a coil to power the lights.' },
        {
          text: 'Power stations spin huge magnets inside coils, making the alternating current in the sockets at home.',
        },
        { text: 'Wind-up radios and torches have a small crank generator inside.' },
      ],
    },
  },
  recall: [
    {
      id: 'spinning-current',
      kind: 'prediction',
      prompt: 'Which way does the current flow when a magnet spins beside a coil?',
      answer: 'One way, then the other, over and over: an alternating current.',
    },
    {
      id: 'name-the-machine',
      kind: 'term',
      prompt: 'What is a machine that makes current by spinning magnets past coils called?',
      answer: 'A generator.',
    },
    {
      id: 'turn-it-faster',
      kind: 'concept',
      prompt: 'What changes when a generator turns faster?',
      answer: 'The current is bigger and reverses more often.',
    },
  ],
} satisfies ModelLesson;
