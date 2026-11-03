import type { ModelLesson } from '@/engine/content/schema';
import {
  leftCartTouching,
  magnetRail,
  rightCartAtEnd,
  rightCartMoved,
  type MagnetRailSnapshot,
} from '@/models/magnet-rail/definition';

// Lesson 2, one idea: magnets push and pull across a gap. Like poles repel, unlike poles
// attract. Which materials a magnet pulls is lesson 3.

export const whatMagnetsDo = {
  kind: 'model',
  id: 'what-magnets-do',
  title: 'What magnets do',
  model: magnetRail.id,
  controls: ['position'],
  instruments: [],
  overlays: [],
  steps: {
    look: {
      text: 'This is a bar magnet in a holder that slides along a wooden rail. Its red end is marked N and its blue end is marked S. At each end of the rail, another bar magnet sits on a small cart that rolls freely. You can drag your magnet along the rail, or use the slider on the right.',
      labels: [
        { anchor: 'holder', text: 'Your magnet' },
        { anchor: 'leftCart', text: 'Magnet on a cart' },
        { anchor: 'rightCart', text: 'Magnet on a cart' },
      ],
    },
    try: {
      predict: {
        question:
          "Your magnet's red end faces the red end of the magnet on the right-hand cart. What will that cart do as your magnet slides close?",
        choices: [
          { id: 'toward', label: 'Roll toward your magnet' },
          { id: 'away', label: 'Roll away from your magnet' },
          { id: 'still', label: 'Stay where it is' },
        ],
        answer: 'away',
      },
      prompts: [
        {
          text: 'Slide your magnet slowly toward the cart on the right.',
          doneWhen: (snapshot: MagnetRailSnapshot) => rightCartMoved(snapshot.state),
        },
        {
          text: 'Now slide it toward the cart on the left.',
          doneWhen: (snapshot: MagnetRailSnapshot) => leftCartTouching(snapshot.state),
        },
      ],
    },
    why: {
      observation:
        'The right-hand cart rolled away before your magnet reached it. The left-hand cart rolled toward your magnet and stuck to it.',
      explanation:
        "Every magnet has two ends called magnetic poles: a north pole and a south pole. Two like poles push each other apart, which is repulsion. Two unlike poles pull together, which is attraction. The right-hand cart's red end faced your red end, north to north, so it rolled away. The left-hand cart's red end faced your blue end, north to south, so it rolled in. Both happen across a gap, without the magnets touching.",
      names: ['magnetic-pole', 'repulsion', 'attraction'],
    },
    world: {
      items: [
        {
          text: 'Magnetic clasps on bags and phone cases hold shut with two magnets, unlike poles facing.',
        },
        {
          text: 'Wooden toy trains with magnet couplings snap together one way round. Turn a carriage around and they push apart.',
        },
        {
          text: 'Maglev trains float above their track on magnets that push and pull against magnets in the track.',
        },
      ],
    },
    challenge: {
      goal: 'Push the right-hand cart all the way to the end of the rail without letting the magnets touch. If they touch, press Reset model and try again.',
      isMet: (snapshot: MagnetRailSnapshot) =>
        rightCartAtEnd(snapshot.state) && !snapshot.state.touchedRight,
    },
  },
  recall: [
    {
      id: 'two-north-poles',
      kind: 'concept',
      prompt: 'What happens when two north poles are brought together?',
      answer: 'They push each other apart. That is repulsion.',
    },
    {
      id: 'north-meets-south',
      kind: 'concept',
      prompt: 'What happens when a north pole meets a south pole?',
      answer: 'They pull together. That is attraction.',
    },
    {
      id: 'name-the-ends',
      kind: 'term',
      prompt: 'What is each end of a magnet called?',
      answer: 'A magnetic pole. Every magnet has a north pole and a south pole.',
    },
  ],
} satisfies ModelLesson;
