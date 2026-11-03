import type { ModelLesson } from '@/engine/content/schema';
import { coilMagnet, stillAndZero, type CoilMagnetSnapshot } from '@/models/coil-magnet/definition';

// Lesson 8, one idea: a moving magnet makes current in a coil, only while it moves; in and out
// give opposite directions. Sliding the magnet is already known, so no control is new.

export const moveAMagnet = {
  kind: 'model',
  id: 'move-a-magnet',
  title: 'Move a magnet',
  model: coilMagnet.id,
  controls: ['position'],
  instruments: [],
  overlays: ['flux', 'current-flow'],
  steps: {
    look: {
      text: 'A coil of many turns of fine copper wire lies on two wooden supports. Its ends are wired to a meter, whose needle swings left or right from the middle when current flows, and to a red and a green light that each let current through one way only. There is no battery. A strong bar magnet on a wooden handle slides along a rail into the coil. You can drag the magnet, or use the slider on the right.',
      labels: [
        { anchor: 'magnet', text: 'Bar magnet' },
        { anchor: 'coil', text: 'Coil' },
        { anchor: 'meter', text: 'Meter' },
        { anchor: 'leds', text: 'Red and green lights' },
      ],
    },
    try: {
      predict: {
        question: 'What will the meter show while the magnet sits still inside the coil?',
        choices: [
          { id: 'steady', label: 'A steady current' },
          { id: 'none', label: 'No current at all' },
          { id: 'swinging', label: 'A current that keeps swinging back and forth' },
        ],
        answer: 'none',
      },
      prompts: [
        {
          text: 'Push the magnet into the coil.',
          doneWhen: (snapshot: CoilMagnetSnapshot) => snapshot.state.pushedIn,
        },
        {
          text: 'Hold it still inside the coil.',
          doneWhen: (snapshot: CoilMagnetSnapshot) => stillAndZero(snapshot.state),
        },
        {
          text: 'Pull it back out.',
          doneWhen: (snapshot: CoilMagnetSnapshot) => snapshot.state.pulledOut,
        },
        {
          text: 'Push it in again, quickly.',
          doneWhen: (snapshot: CoilMagnetSnapshot) => snapshot.state.ledLit,
        },
      ],
    },
    why: {
      observation:
        'Pushing the magnet in swung the needle one way; held still inside, the needle sat in the middle; pulling it out swung the needle the other way. A quick push swung it further and lit one of the lights.',
      explanation:
        "The meter is a galvanometer: its needle shows small currents and which way they flow. A moving magnet changes how much field passes through the coil: the coil's magnetic flux. A changing flux pushes a current round the circuit: an induced current. That is electromagnetic induction. Pushing in, the flux grows; pulling out, it shrinks, so the current flows the other way. A still magnet changes nothing and makes no current. Faster changes make bigger currents.",
      names: ['galvanometer', 'magnetic-flux', 'induced-current', 'electromagnetic-induction'],
      overlay: 'flux',
    },
    world: {
      items: [
        {
          text: 'Shake-to-charge torches slide a magnet back and forth through a coil to charge their battery.',
        },
        {
          text: 'An electric guitar pickup is a magnet inside a coil: the vibrating steel strings change its flux and make the signal.',
        },
        {
          text: 'Contactless bank cards and travel cards are powered by induction from the reader, with no battery inside.',
        },
      ],
    },
  },
  recall: [
    {
      id: 'still-magnet',
      kind: 'prediction',
      prompt: 'A magnet sits still inside a coil. How much current flows?',
      answer: 'None. Current is induced only while the magnetic flux through the coil is changing.',
    },
    {
      id: 'in-and-out',
      kind: 'concept',
      prompt: 'How does the current differ when a magnet goes into a coil and when it comes out?',
      answer: 'It flows opposite ways: the flux grows going in and shrinks coming out.',
    },
    {
      id: 'name-it',
      kind: 'term',
      prompt: 'What is making a current by changing the magnetic field through a coil called?',
      answer: 'Electromagnetic induction. The current it makes is an induced current.',
    },
  ],
} satisfies ModelLesson;
