import { describe, expect, it } from 'vitest';
import {
  filingsBench,
  GLASS,
  GLASS_MAGNET_Z,
  MAGNET,
  type FilingsBenchControls,
  type FilingsBenchState,
  type ObjectId,
} from '@/models/filings-bench/definition';
import { theInvisibleField } from './03-the-invisible-field';

// Lesson 3's copy makes claims about the model: the prediction's answer, the prompts, and what
// the Why says the filings did. These check each claim against the model itself.

const FRAME = 1 / 60;
const { predict, prompts } = theInvisibleField.steps.try;
const START: FilingsBenchControls = { position: 0.075, filings: false };
const INITIAL = filingsBench.createState(START);

interface Run {
  readonly state: FilingsBenchState;
  readonly controls: FilingsBenchControls;
  readonly time: number;
}

function start(): Run {
  return { state: INITIAL, controls: START, time: 0 };
}

/**
 * Runs for `seconds` with the given controls. A new magnet position is reached steadily over
 * the first part of the run, then held for half a second.
 */
function run(from: Run, seconds: number, controls: Partial<FilingsBenchControls>): Run {
  const frames = Math.round(seconds / FRAME);
  const moveFrames = Math.max(1, frames - 30);
  const before = from.controls.position;
  const after = controls.position ?? before;
  let { state, time } = from;
  let current = from.controls;
  for (let frame = 1; frame <= frames; frame++) {
    const position = before + (after - before) * Math.min(1, frame / moveFrames);
    current = { ...from.controls, ...controls, position };
    state = filingsBench.step({ state, controls: current, time }, FRAME);
    time += FRAME;
  }
  return { state, controls: current, time };
}

function done(promptIndex: number, { state, controls, time }: Run): boolean {
  return prompts[promptIndex]?.doneWhen?.({ state, controls, time }) === true;
}

/** How far an object has moved from where it started (m). */
function moved(state: FilingsBenchState, id: ObjectId): number {
  const from = INITIAL.objects[id].body.position;
  const to = state.objects[id].body.position;
  return Math.hypot(to.x - from.x, to.z - from.z);
}

describe('lesson 3 against its model', () => {
  it('has the right answer to its prediction: only the paper clip is pulled', () => {
    expect(predict?.answer).toBe('clip');
    const { state } = run(start(), 5, { position: 1 });
    expect(state.objects.clip.stuckAt).not.toBeNull();
    expect(moved(state, 'peg')).toBe(0);
    expect(moved(state, 'coin')).toBe(0);
  });

  it('leaves the clip alone until the magnet comes close', () => {
    const { state } = run(start(), 2, { position: 0.4 });
    expect(state.objects.clip.stuckAt).toBeNull();
    expect(moved(state, 'clip')).toBe(0);
  });

  it('carries the stuck clip along with the magnet', () => {
    const there = run(start(), 5, { position: 1 });
    const back = run(there, 3, { position: 0.2 });
    const clip = back.state.objects.clip;
    expect(clip.stuckAt).not.toBeNull();
    expect(clip.body.position.x - back.state.magnet).toBeCloseTo(clip.stuckAt ?? NaN, 9);
  });

  it('starts with no prompt done, and ticks each by doing what it says', () => {
    expect(prompts.map((_, index) => done(index, start()))).toEqual([false, false]);
    const slid = run(start(), 5, { position: 1 });
    expect([done(0, slid), done(1, slid)]).toEqual([true, false]);
    const sprinkled = run(start(), 4, { filings: true });
    expect([done(0, sprinkled), done(1, sprinkled)]).toEqual([false, true]);
  });

  it('settles the filings into lines from pole to pole, crowded at the poles', () => {
    const { state } = run(start(), 4, { filings: true });
    expect(state.filings.every((filing) => filing.phase === 'settled')).toBe(true);

    // More filings per area right beside each pole than across the glass as a whole.
    const average = state.filings.length / (4 * GLASS.halfWidth * GLASS.halfDepth);
    const radius = 0.008;
    for (const poleX of [MAGNET.length / 2, -MAGNET.length / 2]) {
      const near = state.filings.filter(
        (filing) =>
          Math.hypot(filing.position.x - poleX, filing.position.z - GLASS_MAGNET_Z) < radius,
      ).length;
      expect(near / (Math.PI * radius ** 2)).toBeGreaterThan(2 * average);
    }

    // Beside the magnet's middle, filings lie along it, as a compass would point there.
    const besideMiddle = state.filings.filter(
      (filing) =>
        Math.abs(filing.position.x) < 0.01 &&
        Math.abs(filing.position.z - (GLASS_MAGNET_Z + 0.02)) < 0.005,
    );
    expect(besideMiddle.length).toBeGreaterThan(3);
    for (const filing of besideMiddle) {
      // Along x is a bearing of a quarter turn, either way round.
      expect(Math.abs(Math.cos(filing.angle))).toBeLessThan(0.3);
    }
  });

  it('wipes the glass when the filings are turned off', () => {
    const sprinkled = run(start(), 2, { filings: true });
    const wiped = run(sprinkled, 0.1, { filings: false });
    expect(wiped.state.filings).toEqual([]);
    expect(wiped.state.sprinkle).toBeNull();
  });
});
