import { describe, expect, it } from 'vitest';
import {
  circuitCurrent,
  stepSwitchedCoil,
  timeConstant,
  type SwitchedCoilCircuit,
} from './circuits';
import { coilInductance, coilResistance, coilWinding, type Coil } from './coil';
import { earthField } from './earth';
import {
  crankAngle,
  generatorFrequency,
  generatorPeakEmf,
  rotatingMagnetDipole,
  type RotatingMagnet,
} from './generator';
import { coaxialFluxLinkage, dipoleFluxLinkage, inducedEmf } from './induction';
import { compassBearing } from './needles';
import {
  coilAt,
  GALVANOMETER_RESISTANCE,
  holdAt,
  relativeError,
  simulateAxialMotion,
  steadyMove,
} from './test-fixtures';
import { add, EAST, length, UP, vec3, ZERO, type Vec3 } from './vector';
import { straightWireField, type StraightWire } from './wire';

// One test per bullet of the spec's "Required tests" list (docs/spec-v1.md, Physics accuracy).
// Each must pass before an experiment ships.

const FRAME = 1 / 60;

function wireCarrying(current: number): StraightWire {
  return { point: ZERO, direction: UP, radius: 0.5e-3, current };
}

/** Compasses on the board around the vertical wire, at three distances and eight directions. */
const COMPASS_POSITIONS: Vec3[] = [0.02, 0.035, 0.05].flatMap((radius) =>
  [20, 70, 110, 160, 200, 250, 290, 340].map((degrees) => {
    const angle = (degrees * Math.PI) / 180;
    return vec3(radius * Math.cos(angle), 0, radius * Math.sin(angle));
  }),
);

function compassAt(position: Vec3, current: number, withEarth: boolean): number {
  const wireField = straightWireField(wireCarrying(current), position);
  const bearing = compassBearing(withEarth ? add(wireField, earthField()) : wireField);
  if (bearing === null) throw new Error('No field at the compass');
  return bearing;
}

/** Smallest angle (rad) between two bearings, from 0 to π. */
function angleBetween(a: number, b: number): number {
  const difference = Math.abs(a - b) % (2 * Math.PI);
  return difference > Math.PI ? 2 * Math.PI - difference : difference;
}

describe('Spec: required physics tests', () => {
  it('doubling distance from the wire halves the field', () => {
    const wire = wireCarrying(5);
    for (const distance of [0.01, 0.02, 0.05, 0.1]) {
      const near = length(straightWireField(wire, vec3(distance, 0, 0)));
      const far = length(straightWireField(wire, vec3(2 * distance, 0, 0)));
      expect(relativeError(far, near / 2)).toBeLessThan(1e-12);
    }
  });

  it('reversing current reverses every compass', () => {
    for (const position of COMPASS_POSITIONS) {
      // In the wire's field alone, every needle turns end for end.
      const forward = compassAt(position, 5, false);
      const reversed = compassAt(position, -5, false);
      expect(angleBetween(forward, reversed)).toBeCloseTo(Math.PI, 12);

      // With Earth's field on, every needle swings to the other side of north.
      expect(Math.sign(compassAt(position, -5, true))).toBe(
        -Math.sign(compassAt(position, 5, true)),
      );
    }
  });

  it('a stationary magnet produces exactly zero induced current', () => {
    // Held still outside the coil, halfway in, and centred inside it.
    for (const position of [-0.2, -0.05, 0]) {
      const { currents } = simulateAxialMotion({
        magnetPositions: holdAt(position, 30),
        coilPositions: holdAt(0, 30),
        dt: FRAME,
      });
      for (const current of currents) {
        expect(current).toBe(0);
      }
    }
  });

  it('inserting and withdrawing give opposite signs; flipping the magnet reverses both', () => {
    const steps = 48;
    const insert = steadyMove(-0.2, 0, steps);
    const withdraw = steadyMove(0, -0.2, steps);

    /** The one current direction seen through a whole stroke. */
    function strokeDirection(magnetPositions: number[], flipped: boolean): number {
      const { currents } = simulateAxialMotion({
        magnetPositions,
        coilPositions: holdAt(0, steps),
        dt: FRAME,
        flipped,
      });
      const directions = new Set(currents.filter((current) => current !== 0).map(Math.sign));
      expect(directions.size).toBe(1);
      return [...directions][0] ?? 0;
    }

    const inserting = strokeDirection(insert, false);
    expect(inserting).not.toBe(0);
    expect(strokeDirection(withdraw, false)).toBe(-inserting);
    expect(strokeDirection(insert, true)).toBe(-inserting);
    expect(strokeDirection(withdraw, true)).toBe(inserting);
  });

  it('moving the coil gives the same result as moving the magnet at the same relative speed', () => {
    const steps = 48;
    const magnetMoves = simulateAxialMotion({
      magnetPositions: steadyMove(-0.2, 0, steps),
      coilPositions: holdAt(0, steps),
      dt: FRAME,
    });
    const coilMoves = simulateAxialMotion({
      magnetPositions: holdAt(-0.2, steps),
      coilPositions: steadyMove(0, -0.2, steps),
      dt: FRAME,
    });

    expect(coilMoves.emfs).toHaveLength(magnetMoves.emfs.length);
    magnetMoves.emfs.forEach((emf, i) => {
      expect(relativeError(coilMoves.emfs[i] ?? Number.NaN, emf)).toBeLessThan(1e-9);
    });
  });

  it('doubling turns doubles induced voltage', () => {
    const steps = 96;
    const motion = {
      magnetPositions: steadyMove(-0.2, 0.2, steps),
      coilPositions: holdAt(0, steps),
      dt: FRAME,
    };
    const fifty = simulateAxialMotion({ ...motion, turns: 50 });
    const hundred = simulateAxialMotion({ ...motion, turns: 100 });

    fifty.emfs.forEach((emf, i) => {
      expect(relativeError(hundred.emfs[i] ?? Number.NaN, 2 * emf)).toBeLessThan(1e-12);
    });
  });

  it('doubling crank speed doubles both peak voltage and frequency', () => {
    const coil = coilAt(0, 200);
    // A small magnet on a vertical shaft just beyond the end of the coil.
    const rotor: RotatingMagnet = {
      position: vec3(0.06, 0, 0),
      shaftAxis: UP,
      referenceDirection: EAST,
      moment: 0.5,
    };

    function crank(rotationsPerSecond: number) {
      const duration = 2;
      const dt = 2e-4;
      const startAngle = 0.3;
      const linkageAt = (time: number) =>
        dipoleFluxLinkage(
          coil,
          rotatingMagnetDipole(rotor, startAngle + crankAngle(rotationsPerSecond, time)),
        );

      let previousLinkage = linkageAt(0);
      let previousEmf = 0;
      let peak = 0;
      let upwardCrossings = 0;
      for (let step = 1; step <= Math.round(duration / dt); step++) {
        const linkage = linkageAt(step * dt);
        const emf = inducedEmf(previousLinkage, linkage, dt);
        peak = Math.max(peak, Math.abs(emf));
        if (previousEmf < 0 && emf >= 0) upwardCrossings++;
        previousLinkage = linkage;
        previousEmf = emf;
      }
      return { peak, frequency: upwardCrossings / duration };
    }

    const slow = crank(2);
    const fast = crank(4);
    expect(relativeError(fast.peak, 2 * slow.peak)).toBeLessThan(1e-4);
    expect(slow.frequency).toBe(2);
    expect(fast.frequency).toBe(4);

    // The simulated waveform agrees with the closed-form peak and frequency.
    expect(relativeError(slow.peak, generatorPeakEmf(coil, rotor, 2))).toBeLessThan(1e-4);
    expect(slow.frequency).toBe(generatorFrequency(2));
  });

  it("capstone: coil B shows current only while coil A's current is changing", () => {
    // Two coils side by side on one axis, 2 cm apart. A has heavier wire and a battery.
    const coilA: Coil = { ...coilAt(-0.035, 200), wireDiameter: 0.5e-3 };
    const coilB = coilAt(0.035, 200);
    const circuit: SwitchedCoilCircuit = {
      batteryVoltage: 1.5,
      closedResistance: coilResistance(coilA) + 0.5,
      openResistance: 200,
      inductance: coilInductance(coilA),
    };
    const mutualInductance = coaxialFluxLinkage(coilWinding(coilA, 1), coilB);
    const resistanceB = coilResistance(coilB) + GALVANOMETER_RESISTANCE;

    // A realistic short rise time: a fraction of a millisecond to a few milliseconds.
    const riseTime = timeConstant(circuit.inductance, circuit.closedResistance);
    expect(riseTime).toBeGreaterThan(1e-4);
    expect(riseTime).toBeLessThan(1e-2);

    const dt = 1e-5;
    const closeStep = 1000; // 10 ms
    const openStep = 6000; // 60 ms
    const endStep = 10000; // 100 ms
    const currentsB = [0]; // indexed by step; step k covers ((k - 1) dt, k dt]
    let currentA = 0;
    for (let step = 1; step <= endStep; step++) {
      const switchClosed = step > closeStep && step <= openStep;
      const nextA = stepSwitchedCoil(currentA, circuit, switchClosed, dt);
      const emfB = inducedEmf(mutualInductance * currentA, mutualInductance * nextA, dt);
      currentsB.push(circuitCurrent(emfB, resistanceB));
      currentA = nextA;
    }
    const during = (from: number, to: number) => currentsB.slice(from, to + 1);

    // Nothing before the switch closes.
    for (const current of during(1, closeStep)) expect(current).toBe(0);

    // A kick as the switch closes, then exactly zero while coil A's current is steady.
    const closingKick = currentsB[closeStep + 1] ?? 0;
    expect(closingKick).not.toBe(0);
    const settled = closeStep + Math.ceil((50 * riseTime) / dt);
    expect(settled).toBeLessThan(openStep);
    for (const current of during(settled, openStep)) expect(current).toBe(0);

    // The opposite kick as the switch opens, then nothing once coil A's current has gone.
    const openingKick = currentsB[openStep + 1] ?? 0;
    expect(Math.sign(openingKick)).toBe(-Math.sign(closingKick));
    for (const current of during(openStep + 100, endStep)) {
      expect(Math.abs(current)).toBeLessThan(1e-15);
    }

    // The two kicks move equal and opposite charge through the galvanometer.
    const charge = (currents: number[]) => currents.reduce((sum, current) => sum + current * dt, 0);
    const closingCharge = charge(during(closeStep + 1, openStep));
    const openingCharge = charge(during(openStep + 1, endStep));
    expect(relativeError(openingCharge, -closingCharge)).toBeLessThan(1e-9);
  });
});
