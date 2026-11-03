import { describe, expect, it } from 'vitest';
import {
  placeholderWireCompass,
  type PlaceholderControls,
  type PlaceholderSnapshot,
  type PlaceholderState,
} from './definition';

const model = placeholderWireCompass;
const FRAME = 1 / 60;

function settleUnder(controls: PlaceholderControls, seconds = 10): PlaceholderState {
  let state = model.createState({ switchClosed: false, level: 'low', reversed: false });
  for (let frame = 0; frame < seconds / FRAME; frame++) {
    state = model.step({ state, controls, time: 0 }, FRAME);
  }
  return state;
}

function snapshot(controls: PlaceholderControls): PlaceholderSnapshot {
  return { state: model.createState(controls), controls, time: 0 };
}

describe('placeholder wire and compass model', () => {
  it('points north with the switch open', () => {
    const state = model.createState({ switchClosed: false, level: 'high', reversed: false });
    expect(state.current).toBe(0);
    expect(state.fieldBearing).toBe(0);
  });

  it('swings the needle onto the field bearing and lets it settle there', () => {
    const state = settleUnder({ switchClosed: true, level: 'high', reversed: true });
    expect(state.needle.angle).toBeCloseTo(state.fieldBearing ?? Number.NaN, 4);
    expect(Math.abs(state.needle.angularVelocity)).toBeLessThan(1e-3);
  });

  it('turns the needle the other way when the current reverses', () => {
    const forward = settleUnder({ switchClosed: true, level: 'medium', reversed: false });
    const reversed = settleUnder({ switchClosed: true, level: 'medium', reversed: true });
    expect(forward.needle.angle).toBeLessThan(0);
    expect(reversed.needle.angle).toBeCloseTo(-forward.needle.angle, 4);
  });

  it("reads 10 µT of the wire's field per amp at the compass", () => {
    const wireField = model.readings.wireField;
    if (wireField === undefined) throw new Error('missing reading');
    for (const [level, microtesla] of [
      ['low', 10],
      ['medium', 20],
      ['high', 40],
    ] as const) {
      const value =
        wireField.read(snapshot({ switchClosed: true, level, reversed: false })) * wireField.scale;
      expect(value).toBeCloseTo(microtesla, 6);
    }
  });

  it('shows the source current on the ammeter, as a level and a size', () => {
    const current = model.readings.current;
    if (current?.describe === undefined) throw new Error('missing reading');
    const high = snapshot({ switchClosed: true, level: 'high', reversed: true });
    expect(current.read(high)).toBe(4);
    expect(current.describe(high)).toBe('High');
    expect(current.describe(snapshot({ switchClosed: false, level: 'high', reversed: true }))).toBe(
      'Off',
    );
  });

  it('hands the overlays its wire with the signed current', () => {
    const sources = model.fieldSources(
      snapshot({ switchClosed: true, level: 'medium', reversed: true }),
    );
    expect(sources.earth).toBe(true);
    expect(sources.wires.map((wire) => wire.current)).toEqual([-2]);
  });
});
