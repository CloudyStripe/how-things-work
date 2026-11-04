import type { ExplorerLesson } from '@/engine/content/schema';
import type { ExplorerView } from '@/models/types';
import { rotorTurning, windTurbine, type TurbineSnapshot } from '@/models/wind-turbine/definition';

// Lesson 10: back to the turbine from lesson 1, with every part explained by the ideas of lessons
// 2 to 9, and the generator overlay showing magnets passing coils. Ends on the teaser that a
// motor is a generator run the other way.

export const backToTheWindmill = {
  kind: 'explorer',
  id: 'back-to-the-windmill',
  title: 'Back to the windmill',
  model: windTurbine.id,
  controls: ['wind'],
  overlays: ['generator'],
  parts: [
    {
      part: 'blades',
      name: 'Blades',
      description: 'Catch the wind. Their shape turns the push of the wind into turning.',
      explanation:
        'Each blade is shaped like an aircraft wing. Wind flowing past pushes it round the hub, so the rotor turns. The blades twist along their length because the tips travel much faster than the roots: in a fresh breeze the tips move about seven times faster than the wind.',
    },
    {
      part: 'hub',
      name: 'Hub',
      description: 'Holds the blades and turns with them, passing their turning to the main shaft.',
      explanation:
        'The hub holds the three blades and turns with them. Motors inside it twist each blade, changing how hard the wind pushes it, to hold the rotor at a safe speed when the wind is strong.',
    },
    {
      part: 'nacelleCover',
      name: 'Nacelle cover',
      description:
        'The housing on top of the tower. It keeps rain and wind off the machinery inside.',
      explanation:
        'The nacelle is the housing on top of the tower. The whole nacelle turns on a bearing to face the wind, steered by the wind vane on its roof.',
    },
    {
      part: 'mainShaft',
      name: 'Main shaft',
      description: 'Carries the slow, strong turning of the blades into the nacelle.',
      explanation:
        "The main shaft carries the rotor's slow, powerful turning into the nacelle. A large bearing round it takes the weight of the blades.",
    },
    {
      part: 'gearbox',
      name: 'Gearbox',
      description:
        'Turns the slow turning of the main shaft into the fast spinning the generator needs.',
      explanation:
        'Gears turn the slow main shaft into a fast one: the generator spins about a hundred times for each turn of the blades. As with the hand crank, spinning faster changes the flux through the coils faster, and makes a bigger current.',
    },
    {
      part: 'generator',
      name: 'Generator',
      description:
        'Turns spinning into electricity. How it does that is what this module is about.',
      explanation:
        'Inside, magnets spin past coils of copper wire. As each magnet passes, the magnetic flux through a coil grows, shrinks and reverses, so the coil makes an alternating current: electromagnetic induction, as when you pushed a magnet into a coil and cranked one past it. In many turbines the magnets are electromagnets, coils with iron cores, so a current sets their strength.',
    },
    {
      part: 'tower',
      name: 'Tower',
      description: 'Holds everything high up, where the wind is stronger and steadier.',
      explanation:
        'The tower lifts the rotor high, where the wind is stronger and steadier than near the ground. Cables inside it carry the current down to the grid.',
    },
  ],
  steps: {
    look: {
      text: 'This is the wind turbine from the first lesson. Now you know enough to understand every part of it. Take it apart again, click each part to read how it works, and turn on the view inside the generator to watch it make electricity.',
      labels: [
        { anchor: 'blades', text: 'Blades' },
        { anchor: 'nacelle', text: 'Nacelle' },
        { anchor: 'tower', text: 'Tower' },
      ],
    },
    try: {
      prompts: [
        {
          text: 'Turn on the wind.',
          doneWhen: (snapshot: TurbineSnapshot) => rotorTurning(snapshot.state),
        },
        {
          text: 'Take parts off until you reach the generator.',
          doneWhen: (_: unknown, view: ExplorerView) => view.removedParts.includes('gearbox'),
        },
        {
          text: 'Click the generator, read how it works, and turn on Inside the generator.',
          doneWhen: (_: unknown, view: ExplorerView) => view.selectedPart === 'generator',
        },
      ],
    },
    why: {
      explanation:
        'Wind pushes the blades round. The gearbox spins the generator fast. Inside it, magnets spin past coils, so the flux through each coil keeps changing and reversing, and each coil makes an alternating current: electromagnetic induction. Run the other way, the same machine is an electric motor: send current into its coils, and the push and pull between their fields and the magnets turns the shaft.',
      names: ['electric-motor'],
      overlay: 'generator',
    },
  },
  recall: [
    {
      id: 'turbine-in-order',
      kind: 'concept',
      prompt: 'How does a wind turbine turn wind into electricity?',
      answer:
        'The wind turns the blades; the gearbox spins the generator fast; magnets spinning past coils make an alternating current by electromagnetic induction.',
    },
    {
      id: 'motor-and-generator',
      kind: 'term',
      prompt: 'What is a generator run the other way, turning current into turning, called?',
      answer: 'An electric motor.',
    },
  ],
} satisfies ExplorerLesson;
