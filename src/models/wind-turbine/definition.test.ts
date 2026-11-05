import { describe, expect, it } from 'vitest';
import { ASSEMBLED } from '../types';
import { coverSeeThrough } from './definition';

describe('coverSeeThrough', () => {
  it.each(['mainShaft', 'gearbox', 'generator'])(
    'shows %s inside the assembled nacelle',
    (part) => {
      expect(coverSeeThrough({ ...ASSEMBLED, selectedPart: part })).toBe(true);
    },
  );

  it.each([null, 'blades', 'hub', 'nacelleCover', 'tower'])(
    'leaves the cover solid with %s picked',
    (part) => {
      expect(coverSeeThrough({ ...ASSEMBLED, selectedPart: part })).toBe(false);
    },
  );

  it('stays see-through while the cover is partly lifted', () => {
    expect(coverSeeThrough({ ...ASSEMBLED, selectedPart: 'gearbox', explode: 0.3 })).toBe(true);
  });

  it('goes solid once the exploded view has lifted the cover clear', () => {
    expect(coverSeeThrough({ ...ASSEMBLED, selectedPart: 'gearbox', explode: 1 })).toBe(false);
  });
});
