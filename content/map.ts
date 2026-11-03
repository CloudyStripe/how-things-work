import type { ModuleMap } from '@/engine/content/schema';

// Every planned module. Arrows run from a module to the modules that build on it. Only EM
// Fundamentals is built in v1; the rest show as coming later.
export const moduleMap = {
  nodes: [
    {
      moduleId: 'em-fundamentals',
      title: 'EM Fundamentals',
      status: 'available',
      row: 0,
      column: 1,
      builtOn: [],
    },
    {
      moduleId: 'magnetism',
      title: 'Magnetism',
      status: 'coming-later',
      row: 1,
      column: 0,
      builtOn: ['em-fundamentals'],
    },
    {
      moduleId: 'electricity',
      title: 'Electricity',
      status: 'coming-later',
      row: 1,
      column: 2,
      builtOn: ['em-fundamentals'],
    },
    {
      moduleId: 'generator',
      title: 'Generator',
      status: 'coming-later',
      row: 2,
      column: 0,
      builtOn: ['magnetism', 'electricity'],
    },
    {
      moduleId: 'transformer',
      title: 'Transformer',
      status: 'coming-later',
      row: 2,
      column: 1,
      builtOn: ['magnetism', 'electricity'],
    },
    {
      moduleId: 'motor',
      title: 'Motor',
      status: 'coming-later',
      row: 2,
      column: 2,
      builtOn: ['magnetism', 'electricity'],
    },
  ],
} satisfies ModuleMap;
