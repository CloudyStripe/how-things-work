import type { Glossary } from '@/engine/content/schema';

// The term registry. Phase 3 holds only the terms the placeholder experiment names; each term
// moves to the experiment that names it as the real experiments are built.
export const glossary = {
  terms: [
    {
      id: 'magnetic-field',
      name: 'magnetic field',
      forms: ['magnetic fields'],
      definition:
        'The region around a magnet or a current-carrying wire where a compass needle feels a turning force.',
      note: 'You cannot see a magnetic field, but you can see what it does: a compass needle turns to line up with it. Earth has one too, which is why a compass points north.',
      related: ['compass-deflection'],
      introducedIn: 'placeholder-wire-compass',
    },
    {
      id: 'compass-deflection',
      name: 'compass deflection',
      forms: ['compass deflections'],
      definition:
        'How far a compass needle turns away from north because of a nearby magnetic field.',
      note: "A bigger deflection means the nearby field is strong compared with Earth's. With no other field around, a compass shows no deflection and points north.",
      related: ['magnetic-field'],
      introducedIn: 'placeholder-wire-compass',
    },
  ],
  confusablePairs: [],
} satisfies Glossary;
