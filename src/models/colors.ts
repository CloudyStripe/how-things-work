// The colour system (spec, Visual design): one family each for magnetism, electricity, and motion
// and mechanics, plus a neutral. The same colour means the same thing in the models, the overlays
// and the interface. No React or three.js here, so the interface can use it without loading the 3D
// view.

export type ColorFamily = 'motion' | 'electricity' | 'magnetism' | 'structure';

/** One colour per family: part swatches, the part card's edge, and the parts themselves. */
export const FAMILY_COLORS: Readonly<Record<ColorFamily, string>> = {
  motion: '#ef8b1f',
  electricity: '#0a9fb8',
  magnetism: '#7240d6',
  structure: '#c3ccd4',
};

export const FAMILY_NAMES: Readonly<Record<ColorFamily, string>> = {
  motion: 'Moving parts',
  electricity: 'Electricity',
  magnetism: 'Magnetism',
  structure: 'Structure',
};

/** Magnetic poles stay red and blue, because the lessons name them, either side of the violet. */
export const POLE_COLORS = { north: '#e2392b', south: '#2460d8' } as const;

/**
 * What the overlays draw with. Each must stay readable against the parts behind it: the current's
 * bright teal runs inside darker teal wires, and field lines are a violet no part is painted.
 */
export const OVERLAY_COLORS = {
  fieldLine: '#6a2fd6',
  /** The same violet, washed out: lines that miss the coil, in the flux overlay. */
  fieldLineFaint: '#c9b3e3',
  /** Earth's field is faint over a bench, but still a magnetic thing. */
  earthField: '#9f86e0',
  current: '#00c2dd',
  coil: '#06728a',
  /** The disc behind the generator overlay, so it reads against whatever colour lies behind. */
  plate: '#ffffff',
  plateOpacity: 0.9,
} as const;
