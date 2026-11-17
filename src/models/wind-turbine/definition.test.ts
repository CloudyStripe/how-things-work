import { describe, expect, it } from 'vitest';
import { ASSEMBLED, type ExplorerView } from '../types';
import { coverSeeThrough, EXPLODE, windTurbine, type TurbineSnapshot } from './definition';

const controls = { wind: false };
const snapshot: TurbineSnapshot = { state: windTurbine.createState(controls), controls, time: 0 };
const labelAt = (part: string, view: ExplorerView) => {
  const anchor = windTurbine.anchors?.[part];
  if (anchor === undefined) throw new Error(`no anchor for ${part}`);
  return anchor(snapshot, view);
};

describe("a part's label", () => {
  it.each(['blades', 'hub', 'nacelleCover', 'tower'])(
    'shows on the outside part %s of the assembled turbine',
    (part) => {
      expect(labelAt(part, ASSEMBLED)).not.toBeNull();
    },
  );

  it.each(['mainShaft', 'gearbox', 'generator'])(
    'hides on %s while the cover is on and closed, and shows once it is off',
    (part) => {
      expect(labelAt(part, ASSEMBLED)).toBeNull();
      expect(
        labelAt(part, { ...ASSEMBLED, removedParts: ['blades', 'hub', 'nacelleCover'] }),
      ).not.toBeNull();
    },
  );

  it('shows on a part inside while the cover is see-through or lifted clear', () => {
    expect(labelAt('gearbox', { ...ASSEMBLED, selectedPart: 'gearbox' })).not.toBeNull();
    expect(labelAt('gearbox', { ...ASSEMBLED, explode: 1 })).not.toBeNull();
  });

  it('hides on a part that is off', () => {
    expect(labelAt('blades', { ...ASSEMBLED, removedParts: ['blades'] })).toBeNull();
  });

  it('moves out with its part as the view explodes', () => {
    const assembled = labelAt('blades', ASSEMBLED);
    const exploded = labelAt('blades', { ...ASSEMBLED, explode: 0.5 });
    const [x, y, z] = EXPLODE.blades ?? [0, 0, 0];
    expect(exploded?.x).toBeCloseTo((assembled?.x ?? 0) + x * 0.5, 9);
    expect(exploded?.y).toBeCloseTo((assembled?.y ?? 0) + y * 0.5, 9);
    expect(exploded?.z).toBeCloseTo((assembled?.z ?? 0) + z * 0.5, 9);
  });
});

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
