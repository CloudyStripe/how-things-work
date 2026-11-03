/** A filament bulb: how much current makes it glow fully, and how fast its filament heats. */
export interface BulbParams {
  /** Current (A) at which it glows at full brightness. */
  readonly ratedCurrent: number;
  /** Resistance (Ω) of the hot filament. */
  readonly resistance: number;
  /** Time constant (s) for the filament to heat up or cool down. */
  readonly warmUpTime: number;
}

/**
 * A torch bulb rated 2.5 V, 0.3 A: about 8 Ω hot. Its thin filament heats and cools in about a
 * twentieth of a second, so it lights almost at once and dims almost at once.
 */
export const TORCH_BULB: BulbParams = { ratedCurrent: 0.3, resistance: 8.3, warmUpTime: 0.05 };

/**
 * Advances how brightly a bulb glows (0 dark, 1 at its rated current) by dt. The power heating
 * the filament goes as current squared, so the glow settles at (current / rated)², whichever way
 * the current flows, and follows a change with the filament's warm-up time. Exact for any step.
 */
export function stepBulbGlow(
  glow: number,
  current: number,
  dt: number,
  params: BulbParams = TORCH_BULB,
): number {
  if (!(dt > 0)) return glow;
  const target = (current / params.ratedCurrent) ** 2;
  return target + (glow - target) * Math.exp(-dt / params.warmUpTime);
}
