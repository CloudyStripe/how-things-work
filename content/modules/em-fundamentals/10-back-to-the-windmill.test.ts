import { describe, expect, it } from 'vitest';
import { ASSEMBLED, type ExplorerView } from '@/models/types';
import { windTurbine, type TurbineState } from '@/models/wind-turbine/definition';
import { backToTheWindmill } from './10-back-to-the-windmill';

// Lesson 10's copy makes claims about the model: that the generator's coils make an alternating
// current as its magnets pass, more of it the faster it turns, and the prompts. These check them.

const FRAME = 1 / 60;
const { prompts } = backToTheWindmill.steps.try;

function blow(state: TurbineState, wind: boolean, seconds: number): TurbineState {
  let next = state;
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    next = windTurbine.step({ state: next, controls: { wind }, time: 0 }, FRAME);
  }
  return next;
}

function coils(state: TurbineState) {
  return windTurbine.generatorView?.({ state, controls: { wind: true }, time: 0 }).coils ?? [];
}

const start = windTurbine.createState({ wind: false });

describe('lesson 10 against its model', () => {
  it('makes no current while the rotor is still', () => {
    expect(coils(start).every((coil) => coil.current === 0)).toBe(true);
  });

  it("makes an alternating current in each coil as the generator's magnets pass", () => {
    let state = blow(start, true, 40);
    const signs = new Set<number>();
    for (let frame = 0; frame < 240; frame++) {
      state = blow(state, true, FRAME);
      const current = coils(state)[0]?.current ?? 0;
      if (Math.abs(current) > 0.2) signs.add(Math.sign(current));
    }
    expect([...signs].sort()).toEqual([-1, 1]);
  });

  it('makes more current the faster the rotor turns', () => {
    const peak = (state: TurbineState) => {
      let most = 0;
      let next = state;
      for (let frame = 0; frame < 240; frame++) {
        next = blow(next, true, FRAME);
        most = Math.max(most, ...coils(next).map((coil) => Math.abs(coil.current)));
      }
      return most;
    };
    const spinningUp = peak(blow(start, true, 2));
    const settled = peak(blow(start, true, 40));
    expect(settled).toBeGreaterThan(spinningUp);
    expect(settled).toBeCloseTo(1, 1);
  });

  it('starts with no prompt done, and ticks each by doing what it says', () => {
    const done = (index: number, state: TurbineState, view: ExplorerView) =>
      prompts[index]?.doneWhen?.({ state, controls: { wind: true }, time: 0 }, view) === true;
    expect(prompts.map((_, index) => done(index, start, ASSEMBLED))).toEqual([false, false, false]);
    expect(done(0, blow(start, true, 10), ASSEMBLED)).toBe(true);
    const toGenerator = {
      ...ASSEMBLED,
      removedParts: ['blades', 'hub', 'nacelleCover', 'mainShaft', 'gearbox'],
    };
    expect(done(1, start, toGenerator)).toBe(true);
    expect(done(2, start, { ...toGenerator, selectedPart: 'generator' })).toBe(true);
  });
});
