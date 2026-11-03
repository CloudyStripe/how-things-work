import { describe, expect, it } from 'vitest';
import { MU_0 } from './constants';
import { barMagnetForce, barMagnetPoles } from './forces';
import type { BarMagnet } from './magnet';
import { magnetAt, relativeError } from './test-fixtures';
import { add, length, sub, vec3 } from './vector';

const LENGTH = 0.06;

describe('barMagnetPoles', () => {
  it("puts north at the end the axis points to, with the magnet's moment between them", () => {
    const [north, south] = barMagnetPoles(magnetAt(0));
    expect(north.position.x).toBeCloseTo(LENGTH / 2);
    expect(south.position.x).toBeCloseTo(-LENGTH / 2);
    expect(north.strength).toBeCloseTo(-south.strength);
    expect(north.strength * LENGTH).toBeCloseTo(3);
  });
});

describe('barMagnetForce', () => {
  it('pulls together two magnets in line facing north to south', () => {
    // Both point east: the left magnet's N faces the right magnet's S.
    const force = barMagnetForce(magnetAt(0), magnetAt(0.1));
    expect(force.x).toBeLessThan(0);
  });

  it('pushes apart two magnets facing north to north', () => {
    const force = barMagnetForce(magnetAt(0), magnetAt(0.1, true));
    expect(force.x).toBeGreaterThan(0);
  });

  it('reverses exactly when either magnet is turned around', () => {
    const base = barMagnetForce(magnetAt(0), magnetAt(0.09));
    const targetTurned = barMagnetForce(magnetAt(0), magnetAt(0.09, true));
    const sourceTurned = barMagnetForce(magnetAt(0, true), magnetAt(0.09));
    expect(length(add(base, targetTurned))).toBeLessThan(1e-12);
    expect(length(add(base, sourceTurned))).toBeLessThan(1e-12);
  });

  it('is equal and opposite on the two magnets, in any arrangement', () => {
    const a: BarMagnet = { ...magnetAt(0), center: vec3(0.01, 0.002, -0.03) };
    const b: BarMagnet = { ...magnetAt(0, true), center: vec3(0.08, 0, 0.02) };
    const onB = barMagnetForce(a, b);
    const onA = barMagnetForce(b, a);
    expect(length(add(onA, onB)) / length(onB)).toBeLessThan(1e-12);
  });

  it('matches the force between two dipoles far apart, falling off as 1 / distance⁴', () => {
    const separation = 20 * LENGTH;
    const exact = barMagnetForce(magnetAt(0), magnetAt(separation)).x;
    // Coaxial dipoles: F = 3 μ0 m² / (2π d⁴), attractive.
    const dipoles = (-3 * MU_0 * 3 * 3) / (2 * Math.PI * separation ** 4);
    expect(relativeError(exact, dipoles)).toBeLessThan(1e-2);

    const twiceAsFar = barMagnetForce(magnetAt(0), magnetAt(2 * separation)).x;
    expect(relativeError(exact / twiceAsFar, 16)).toBeLessThan(1e-2);
  });

  it('gives a realistic pull between two classroom magnets nearly touching', () => {
    // 6 cm ceramic magnets with a 1 cm gap between them: a few tenths of a newton.
    const force = barMagnetForce(magnetAt(0), magnetAt(LENGTH + 0.01));
    expect(-force.x).toBeGreaterThan(0.1);
    expect(-force.x).toBeLessThan(5);
  });

  it('acts along the line between two magnets side by side, pushing them apart', () => {
    // Parallel and side by side: unlike ends are diagonal, like ends face each other.
    const left = magnetAt(0);
    const right: BarMagnet = { ...magnetAt(0), center: vec3(0, 0, 0.03) };
    const force = barMagnetForce(left, right);
    const away = sub(right.center, left.center);
    expect(force.z * away.z).toBeGreaterThan(0);
    expect(Math.abs(force.x)).toBeLessThan(1e-9 * length(force));
  });
});
