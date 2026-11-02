import { describe, expect, it } from 'vitest';
import { MU_0 } from './constants';
import { coaxialLoopMutualInductance, currentLoopField, type CurrentLoop } from './loop';
import { pointDipoleField } from './magnet';
import { gaussLegendre } from './quadrature';
import { relativeError } from './test-fixtures';
import { dot, EAST, length, scale, sub, UP, vec3, ZERO } from './vector';

const LOOP: CurrentLoop = { center: ZERO, axis: UP, radius: 0.02, current: 2 };

describe('currentLoopField', () => {
  it('gives μ0 I / (2a) at the centre, along the axis', () => {
    const field = currentLoopField(LOOP, ZERO);
    expect(relativeError(field.y, (MU_0 * 2) / (2 * 0.02))).toBeLessThan(1e-14);
    expect(field.x).toBe(0);
    expect(field.z).toBe(0);
  });

  it('joins the on-axis formula smoothly just off the axis', () => {
    for (const height of [0, 0.01, 0.05]) {
      const onAxis = currentLoopField(LOOP, vec3(0, height, 0));
      const nearAxis = currentLoopField(LOOP, vec3(1e-8, height, 0));
      expect(relativeError(nearAxis.y, onAxis.y)).toBeLessThan(1e-9);
    }
  });

  it('becomes a dipole field of moment I π a² far away', () => {
    const dipole = { position: ZERO, moment: scale(UP, LOOP.current * Math.PI * 0.02 ** 2) };
    for (const direction of [UP, EAST, vec3(0.6, 0.8, 0), vec3(0, -0.6, 0.8)]) {
      // 5 m out, the loop's next-order correction, about (a / r)², is below 1e-4.
      const point = scale(direction, 5);
      const exact = currentLoopField(LOOP, point);
      const expected = pointDipoleField(dipole, point);
      expect(length(sub(exact, expected)) / length(expected)).toBeLessThan(1e-4);
    }
  });

  it('is mirror-symmetric: the axial part is even and the radial part odd across the loop plane', () => {
    const above = currentLoopField(LOOP, vec3(0.015, 0.01, 0));
    const below = currentLoopField(LOOP, vec3(0.015, -0.01, 0));
    expect(below.y).toBeCloseTo(above.y, 15);
    expect(below.x).toBeCloseTo(-above.x, 15);
  });
});

describe('coaxialLoopMutualInductance', () => {
  it('is symmetric in the two loops', () => {
    expect(coaxialLoopMutualInductance(0.02, 0.015, 0.01)).toBeCloseTo(
      coaxialLoopMutualInductance(0.015, 0.02, 0.01),
      20,
    );
  });

  it('equals the flux through one loop from unit current in the other', () => {
    // Integrate loop A's field over loop B's disk, independently of Maxwell's formula.
    const a = 0.02;
    const b = 0.015;
    const separation = 0.01;
    const source: CurrentLoop = { center: ZERO, axis: UP, radius: a, current: 1 };
    const flux = gaussLegendre(64).reduce((sum, node) => {
      const rho = (b / 2) * (node.x + 1);
      const field = currentLoopField(source, vec3(rho, separation, 0));
      return sum + (b / 2) * node.weight * dot(field, UP) * 2 * Math.PI * rho;
    }, 0);
    expect(relativeError(coaxialLoopMutualInductance(a, b, separation), flux)).toBeLessThan(1e-9);
  });

  it('falls to the dipole-dipole limit μ0 π a² b² / (2 d³) far apart', () => {
    const exact = coaxialLoopMutualInductance(0.02, 0.015, 1);
    const limit = (MU_0 * Math.PI * 0.02 ** 2 * 0.015 ** 2) / 2;
    expect(relativeError(exact, limit)).toBeLessThan(2e-3);
  });

  it('is continuous where it switches from the exact form to the series', () => {
    const a = 0.02;
    const b = 0.02;
    const switchover = Math.sqrt((4 * a * b) / 1e-4 - (a + b) ** 2);
    const inner = coaxialLoopMutualInductance(a, b, switchover * (1 - 1e-9));
    const outer = coaxialLoopMutualInductance(a, b, switchover * (1 + 1e-9));
    expect(relativeError(outer, inner)).toBeLessThan(1e-7);
  });
});
