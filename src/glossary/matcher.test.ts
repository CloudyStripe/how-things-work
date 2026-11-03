import { describe, expect, it } from 'vitest';
import type { Term } from '@/engine/content/schema';
import { createTermMatcher } from './matcher';

function term(id: string, name: string, forms: string[] = []): Term {
  return {
    id,
    name,
    forms,
    definition: 'A definition.',
    note: 'A note.',
    related: [],
    introducedIn: 'some-lesson',
  };
}

const match = createTermMatcher([
  term('magnetic-field', 'magnetic field', ['magnetic fields']),
  term('field-lines', 'field lines'),
  term('right-hand-rule', 'right-hand rule'),
  term('current', 'electric current'),
]);

describe('createTermMatcher', () => {
  it('splits text into plain runs and terms, ignoring case', () => {
    expect(match('The Magnetic field circles the wire.')).toEqual([
      { text: 'The ' },
      { text: 'Magnetic field', termId: 'magnetic-field' },
      { text: ' circles the wire.' },
    ]);
  });

  it('prefers the longest form', () => {
    expect(match('magnetic fields')).toEqual([
      { text: 'magnetic fields', termId: 'magnetic-field' },
    ]);
  });

  it('matches whole words only', () => {
    expect(match('magnetic fieldwork')).toEqual([{ text: 'magnetic fieldwork' }]);
    expect(match('unmagnetic field')).toEqual([{ text: 'unmagnetic field' }]);
  });

  it('finds several terms, including ones with hyphens', () => {
    const terms = match('Use the right-hand rule to draw field lines.')
      .map((segment) => segment.termId)
      .filter(Boolean);
    expect(terms).toEqual(['right-hand-rule', 'field-lines']);
  });

  it('leaves text with no terms as one run', () => {
    expect(match('Nothing to see here.')).toEqual([{ text: 'Nothing to see here.' }]);
    expect(createTermMatcher([])('Anything.')).toEqual([{ text: 'Anything.' }]);
  });
});
