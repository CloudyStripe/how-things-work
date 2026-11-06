import type { ModelLesson } from '@/engine/content/schema';
import {
  bulbLit,
  circuitBoard,
  openedAgain,
  type CircuitBoardSnapshot,
} from '@/models/circuit-board/definition';

// Lesson 5, one idea: current flows round a closed loop of conductor; break the loop and it
// stops. The switch is the one new control.

export const whatCurrentIs = {
  kind: 'model',
  id: 'what-current-is',
  title: 'What current is',
  model: circuitBoard.id,
  controls: ['switch'],
  instruments: [],
  overlays: ['current-flow'],
  steps: {
    look: {
      text: "This is a circuit on a wooden board: a battery on the left, a switch at the front and a bulb on the right, joined by copper wires in plastic coating. The battery's ends are marked + and −. The switch is open: its metal blade is lifted off its contact. You can click the switch, or use the buttons on the right.",
      labels: [
        { anchor: 'battery', text: 'Battery' },
        { anchor: 'switch', text: 'Switch' },
        { anchor: 'bulb', text: 'Bulb' },
        { anchor: 'wire', text: 'Copper wire in plastic coating' },
      ],
    },
    try: {
      predict: {
        question: 'When you close the switch, how will the current flow?',
        choices: [
          {
            id: 'loop',
            label:
              'Out of one end of the battery, round through the bulb and back into the other end',
          },
          { id: 'both', label: 'Out of both ends of the battery, meeting at the bulb' },
          { id: 'used-up', label: 'Out of the battery to the bulb, where it is used up' },
        ],
        answer: 'loop',
      },
      prompts: [
        {
          text: 'Close the switch.',
          doneWhen: (snapshot: CircuitBoardSnapshot) => bulbLit(snapshot.state),
        },
        {
          text: 'Open it again.',
          doneWhen: (snapshot: CircuitBoardSnapshot) => openedAgain(snapshot.state),
        },
      ],
    },
    why: {
      observation:
        'The bulb lit the moment the switch closed and went dark the moment it opened. With the current flow on, the current leaves the battery at the end marked +, goes round through the switch and the bulb, and comes back in at the end marked −.',
      explanation:
        'Closing the switch completed a loop of copper from the battery, through the bulb and back. That loop is an electric circuit. The battery drives an electric current round it, a flow of electricity, the same all the way round. Copper is a conductor: current flows through it easily. The plastic coating is an insulator: current cannot flow through it, so it keeps the current in the copper. Break the loop anywhere and the current stops everywhere.',
      names: ['electric-current', 'electric-circuit', 'conductor', 'insulator'],
      overlay: 'current-flow',
    },
    world: {
      items: [
        { text: 'A torch is this circuit in a tube: batteries, a switch and a bulb.' },
        {
          text: 'A light switch on the wall opens and closes the circuit to a ceiling light.',
        },
        {
          text: "Electricians' screwdrivers have plastic handles, because plastic is an insulator.",
        },
      ],
    },
  },
  recall: [
    {
      id: 'where-current-goes',
      kind: 'prediction',
      prompt: 'Where does the current go when a battery lights a bulb?',
      answer:
        'Out of one end of the battery, round through the bulb and back into the other end: round a closed loop called an electric circuit.',
    },
    {
      id: 'broken-loop',
      kind: 'concept',
      prompt: 'What happens to the current when a circuit is broken anywhere?',
      answer: 'It stops everywhere at once.',
    },
    {
      id: 'conductor-or-insulator',
      kind: 'term',
      prompt:
        'What are a material current flows through easily, and one it cannot flow through, called?',
      answer: 'A conductor, such as copper, and an insulator, such as plastic.',
    },
  ],
} satisfies ModelLesson;
