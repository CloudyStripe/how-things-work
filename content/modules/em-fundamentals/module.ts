import type { Module } from '@/engine/content/schema';
import { theWindmill } from './01-the-windmill';
import { whatMagnetsDo } from './02-what-magnets-do';
import { theInvisibleField } from './03-the-invisible-field';
import { whatACompassIs } from './04-what-a-compass-is';
import { whatCurrentIs } from './05-what-current-is';
import { currentMakesAField } from './06-current-makes-a-field';
import { coilIt } from './07-coil-it';
import { moveAMagnet } from './08-move-a-magnet';
import { spinIt } from './09-spin-it';
import { backToTheWindmill } from './10-back-to-the-windmill';

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
  lessons: [
    theWindmill,
    whatMagnetsDo,
    theInvisibleField,
    whatACompassIs,
    whatCurrentIs,
    currentMakesAField,
    coilIt,
    moveAMagnet,
    spinIt,
    backToTheWindmill,
  ],
} satisfies Module;
