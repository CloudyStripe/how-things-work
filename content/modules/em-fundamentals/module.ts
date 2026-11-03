import type { Module } from '@/engine/content/schema';
import { placeholderExperiment } from './placeholder-experiment';

export const emFundamentals = {
  id: 'em-fundamentals',
  title: 'EM Fundamentals',
  hook: 'Almost every power station on Earth, whether coal, nuclear, hydro or wind, ends the same way: it spins magnets past coils of wire. This module shows why that works.',
  history: [
    'In 1820 Hans Christian Ørsted saw a compass needle twitch near a live wire.',
    'In 1831 Michael Faraday made current by moving a magnet near a coil.',
  ],
  prerequisites: [],
  // Phase 3 placeholder; Experiment 1 replaces it in Phase 4.
  experiments: [placeholderExperiment],
} satisfies Module;
