import type { Module } from '@/engine/content/schema';
import { theWindmill } from './01-the-windmill';
import { whatMagnetsDo } from './02-what-magnets-do';

export const emFundamentals = {
  id: 'em-fundamentals',
  title: 'EM Fundamentals',
  hook: 'Almost every power station on Earth, whether coal, nuclear, hydro or wind, ends the same way: it spins magnets past coils of wire. This module shows why that works.',
  history: [
    'In 1820 Hans Christian Ørsted saw a compass needle twitch near a live wire.',
    'In 1831 Michael Faraday made current by moving a magnet near a coil.',
  ],
  prerequisites: [],
  // Qualitative: no numbers, units, data tables or Pattern steps.
  numbers: false,
  lessons: [theWindmill, whatMagnetsDo],
  comingLater: [
    'The invisible field',
    'What a compass is',
    'What current is',
    'Current makes a field',
    'Coil it',
    'Move a magnet',
    'Spin it',
    'Back to the windmill',
  ],
} satisfies Module;
