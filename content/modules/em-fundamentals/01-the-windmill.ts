import type { ExplorerLesson } from '@/engine/content/schema';
import { rotorTurning, windTurbine, type TurbineSnapshot } from '@/models/wind-turbine/definition';
import type { ExplorerView } from '@/models/types';

// Lesson 1, the hook: a wind turbine to take apart. Lesson 10 comes back to it with every part
// explained.

export const theWindmill = {
  kind: 'explorer',
  id: 'the-windmill',
  title: 'The windmill',
  model: windTurbine.id,
  controls: ['wind'],
  overlays: [],
  parts: [
    {
      part: 'blades',
      name: 'Blades',
      description: 'Catch the wind. Their shape turns the push of the wind into turning.',
    },
    {
      part: 'hub',
      name: 'Hub',
      description: 'Holds the blades and turns with them, passing their turning to the main shaft.',
    },
    {
      part: 'nacelleCover',
      name: 'Nacelle cover',
      description:
        'The housing on top of the tower. It keeps rain and wind off the machinery inside.',
    },
    {
      part: 'mainShaft',
      name: 'Main shaft',
      description: 'Carries the slow, strong turning of the blades into the nacelle.',
    },
    {
      part: 'gearbox',
      name: 'Gearbox',
      description:
        'Turns the slow turning of the main shaft into the fast spinning the generator needs.',
    },
    {
      part: 'generator',
      name: 'Generator',
      description:
        'Turns spinning into electricity. How it does that is what this module is about.',
    },
    {
      part: 'tower',
      name: 'Tower',
      description: 'Holds everything high up, where the wind is stronger and steadier.',
    },
  ],
  steps: {
    look: {
      text: "This is a wind turbine, the kind that stands on hills and out at sea. Wind turns its blades, and somewhere inside, that turning becomes electricity for homes and factories. By the end of this module you'll understand how.",
      labels: [
        { anchor: 'blades', text: 'Blades' },
        { anchor: 'nacelle', text: 'Nacelle' },
        { anchor: 'tower', text: 'Tower' },
      ],
    },
    try: {
      prompts: [
        {
          text: 'Turn on the wind and watch the blades turn.',
          doneWhen: (snapshot: TurbineSnapshot) => rotorTurning(snapshot.state),
        },
        {
          text: 'Drag the exploded view slider to pull the turbine apart.',
          doneWhen: (_: unknown, view: ExplorerView) => view.explode >= 0.8,
        },
        {
          text: 'Click any part, on the model or in the parts list, to see what it does.',
          doneWhen: (_: unknown, view: ExplorerView) => view.selectedPart !== null,
        },
        {
          text: 'Take parts off one at a time until you reach the generator.',
          doneWhen: (_: unknown, view: ExplorerView) => view.removedParts.includes('gearbox'),
        },
      ],
    },
    why: {
      explanation:
        'The generator is where the turning becomes electricity. To see how, the next lessons build up one idea at a time: what magnets do, the field around them, what current is, and what happens when a magnet and a coil of wire move past each other. In the last lesson you will come back to this turbine and explain every part.',
      names: [],
    },
  },
} satisfies ExplorerLesson;
