import { magnetRail } from './magnet-rail/definition';
import type { AnyModel } from './types';
import { windTurbineStandin } from './wind-turbine-standin/definition';

/** Every model, by id. Content files name a model by its id. */
export const models: Readonly<Record<string, AnyModel>> = {
  [windTurbineStandin.id]: windTurbineStandin,
  [magnetRail.id]: magnetRail,
};
