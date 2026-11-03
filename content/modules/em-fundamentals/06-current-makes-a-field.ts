import type { ModelLesson } from '@/engine/content/schema';
import { allNorth, wireBoard, type WireBoardSnapshot } from '@/models/wire-board/definition';

// Lesson 6, one idea: a wire carrying current has a circular field around it; reverse the
// current and the field reverses. The switch is known from lesson 5; reversing the battery is
// the one new control.

export const currentMakesAField = {
  kind: 'model',
  id: 'current-makes-a-field',
  title: 'Current makes a field',
  model: wireBoard.id,
  controls: ['switch', 'battery'],
  instruments: [],
  overlays: ['field-lines', 'current-flow'],
  steps: {
    look: {
      text: "A tall copper wire rises through a hole in the middle of a board, and small compasses sit on the board around it. At the back are a battery and a switch like the last lesson's; closing the switch sends current up the wire. With no current, every compass points north. You can click the switch, or use the buttons on the right.",
      labels: [
        { anchor: 'wire', text: 'Copper wire' },
        { anchor: 'compasses', text: 'Compasses' },
        { anchor: 'battery', text: 'Battery' },
        { anchor: 'switch', text: 'Switch' },
      ],
    },
    try: {
      predict: {
        question:
          'Copper is not pulled by a magnet. When current flows up the wire, what will the compasses near it do?',
        choices: [
          { id: 'toward', label: 'Point toward the wire' },
          { id: 'away', label: 'Point away from the wire' },
          { id: 'around', label: 'Turn to point round the wire, in a circle' },
          { id: 'still', label: 'Stay pointing north' },
        ],
        answer: 'around',
      },
      prompts: [
        {
          text: 'Close the switch, and watch the compasses.',
          doneWhen: (snapshot: WireBoardSnapshot) => snapshot.state.flowedUp,
        },
        {
          text: 'Reverse the battery, with the switch closed.',
          doneWhen: (snapshot: WireBoardSnapshot) =>
            snapshot.state.flowedUp && snapshot.state.flowedDown,
        },
        {
          text: 'Open the switch, and watch the compasses swing back.',
          doneWhen: (snapshot: WireBoardSnapshot) =>
            snapshot.state.openedAfterBoth && allNorth(snapshot.state),
        },
      ],
    },
    why: {
      observation:
        'The compasses near the wire swung round to point in a circle round it; the ones farther out turned less. Reversing the battery turned every compass the other way round the circle. With the switch open, they all swung back to north.',
      explanation:
        "The current in the wire made a magnetic field that circles round it, and each compass turned to line up with it: compass deflection. Near the wire the field is strong and compasses point round the circle. Farther out it is weaker, so Earth's field pulls them back toward north. Reverse the current and the circle reverses. The right-hand rule gives its direction: point your right thumb along the current, and your fingers curl the way the field goes round.",
      names: ['compass-deflection', 'right-hand-rule'],
      overlay: 'field-lines',
    },
    world: {
      items: [
        {
          text: 'Electricians measure the current in a wire with a clamp meter, which senses the field round the wire without touching the copper.',
        },
        {
          text: 'Ships and aircraft keep wires that carry current away from their compasses, or correct the compass for them.',
        },
      ],
    },
  },
  recall: [
    {
      id: 'field-round-a-wire',
      kind: 'concept',
      prompt: 'What does a wire carrying current make around it?',
      answer:
        'A magnetic field that circles round the wire. Reverse the current and it circles the other way.',
    },
    {
      id: 'name-the-turning',
      kind: 'term',
      prompt:
        'What is a compass needle turning away from north, because another field acts on it, called?',
      answer: 'Compass deflection.',
    },
    {
      id: 'which-way-round',
      kind: 'concept',
      prompt: 'How do you find which way the field circles a wire?',
      answer:
        'The right-hand rule: point your right thumb along the current, and your fingers curl the way the field goes round.',
    },
  ],
} satisfies ModelLesson;
