import type { Glossary } from '@/engine/content/schema';

// The term registry. Each term is named in the Why step of exactly one lesson; terms arrive
// with the lessons that name them.
export const glossary = {
  terms: [
    {
      id: 'magnetic-pole',
      name: 'magnetic pole',
      forms: [
        'magnetic poles',
        'north pole',
        'north poles',
        'south pole',
        'south poles',
        'pole',
        'poles',
      ],
      definition:
        'Either end of a magnet, where its push and pull are strongest. Every magnet has a north pole and a south pole.',
      note: 'Cut a magnet in half and each half has its own north and south pole: a pole never comes on its own. Magnets are often painted red at the north end and blue at the south.',
      related: ['attraction', 'repulsion'],
      introducedIn: 'what-magnets-do',
    },
    {
      id: 'attraction',
      name: 'attraction',
      forms: ['attract', 'attracts', 'attracted', 'magnetic attraction'],
      definition:
        'The pull between two unlike magnetic poles, a north and a south, drawing them together.',
      note: 'Attraction acts across a gap: the magnets start to move toward each other before they touch, and the pull grows quickly as they get closer.',
      related: ['repulsion', 'magnetic-pole'],
      introducedIn: 'what-magnets-do',
    },
    {
      id: 'repulsion',
      name: 'repulsion',
      forms: ['repel', 'repels', 'repelled', 'magnetic repulsion'],
      definition:
        'The push between two like magnetic poles, north and north or south and south, driving them apart.',
      note: 'Like attraction, repulsion acts across a gap and grows quickly as the poles get closer. Turn one magnet around and the push becomes a pull.',
      related: ['attraction', 'magnetic-pole'],
      introducedIn: 'what-magnets-do',
    },
  ],
  confusablePairs: [],
} satisfies Glossary;
