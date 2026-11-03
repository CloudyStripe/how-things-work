import { circuitBoard } from './circuit-board/definition';
import { coilTray } from './coil-tray/definition';
import { compassBench } from './compass-bench/definition';
import { filingsBench } from './filings-bench/definition';
import { magnetRail } from './magnet-rail/definition';
import type { AnyModel } from './types';
import { windTurbineStandin } from './wind-turbine-standin/definition';
import { wireBoard } from './wire-board/definition';

/** Every model, by id. Content files name a model by its id. */
export const models: Readonly<Record<string, AnyModel>> = {
  [windTurbineStandin.id]: windTurbineStandin,
  [magnetRail.id]: magnetRail,
  [filingsBench.id]: filingsBench,
  [compassBench.id]: compassBench,
  [circuitBoard.id]: circuitBoard,
  [wireBoard.id]: wireBoard,
  [coilTray.id]: coilTray,
};
