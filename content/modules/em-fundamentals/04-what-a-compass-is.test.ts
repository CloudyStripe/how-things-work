import { describe, expect, it } from 'vitest';
import {
  compassBench,
  MAGNET_X,
  needleOffNorth,
  NORTH_POLE,
  SOUTH_POLE,
  spotAt,
  type CompassBenchState,
} from '@/models/compass-bench/definition';
import type { Spot } from '@/models/types';
import { whatACompassIs } from './04-what-a-compass-is';

// Lesson 4's copy makes claims about the model: the prediction's answer, the prompts, and where
// the needle points. These check each claim against the model itself.

const FRAME = 1 / 60;
const { predict, prompts } = whatACompassIs.steps.try;
const HOME = spotAt(0.24, 0.02);

interface Run {
  readonly state: CompassBenchState;
  readonly spot: Spot;
}

function start(): Run {
  return { state: compassBench.createState({ compass: HOME }), spot: HOME };
}

/** Slides the compass to `spot` over a second, then lets the needle settle for two more. */
function moveTo(from: Run, spot: Spot): Run {
  let state = from.state;
  for (let frame = 1; frame <= 180; frame++) {
    const share = Math.min(1, frame / 60);
    const compass = {
      across: from.spot.across + (spot.across - from.spot.across) * share,
      depth: from.spot.depth + (spot.depth - from.spot.depth) * share,
    };
    state = compassBench.step({ state, controls: { compass }, time: 0 }, FRAME);
  }
  return { state, spot };
}

function done(promptIndex: number, { state, spot }: Run): boolean {
  return prompts[promptIndex]?.doneWhen?.({ state, controls: { compass: spot }, time: 0 }) === true;
}

/** The needle's north end points east (+x), within a margin. */
function pointsEast(state: CompassBenchState): boolean {
  return Math.abs(state.needle.angle - Math.PI / 2) < 0.3;
}

const besideNorth = spotAt(NORTH_POLE.x + 0.05, 0);
const besideSouth = spotAt(SOUTH_POLE.x - 0.05, 0);

describe('lesson 4 against its model', () => {
  it('starts where the content says, far from the magnet and pointing north', () => {
    expect(compassBench.controls.compass.default).toEqual(HOME);
    const { state } = start();
    expect(state.compass.x - MAGNET_X).toBeGreaterThan(0.32);
    expect(needleOffNorth(state)).toBeLessThan(0.1);
  });

  it("has the right answer to its prediction: at the red end, the needle's red end points away", () => {
    expect(predict?.answer).toBe('away');
    // The red end faces east, so away from the magnet is east.
    expect(pointsEast(moveTo(start(), besideNorth).state)).toBe(true);
  });

  it('points toward the magnet at its blue end', () => {
    // West of the magnet, toward it is east again.
    const { state } = moveTo(moveTo(start(), besideNorth), besideSouth);
    expect(pointsEast(state)).toBe(true);
  });

  it('starts with no prompt done, and ticks each by doing what it says', () => {
    expect(prompts.map((_, index) => done(index, start()))).toEqual([false, false, false]);
    const north = moveTo(start(), besideNorth);
    expect([done(0, north), done(1, north)]).toEqual([true, false]);
    const south = moveTo(north, besideSouth);
    expect([done(0, south), done(1, south)]).toEqual([false, true]);
    // Back out far, the needle swings to north and the last prompt ticks.
    const far = moveTo(south, HOME);
    expect(done(2, far)).toBe(true);
    expect(needleOffNorth(far.state)).toBeLessThan(0.12);
  });

  it('keeps the compass off the magnet', () => {
    const { state } = moveTo(start(), spotAt(MAGNET_X, 0));
    const clear = Math.abs(state.compass.x - MAGNET_X) > 0.025 || Math.abs(state.compass.z) > 0.006;
    expect(clear).toBe(true);
  });
});
