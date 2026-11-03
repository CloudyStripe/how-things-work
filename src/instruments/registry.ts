import { AmmeterReadout } from './AmmeterReadout';
import type { InstrumentInfo } from './types';

/** Every instrument readout, by id. Content pairs an instrument with the model reading it shows. */
export const instruments: Readonly<Record<string, InstrumentInfo>> = {
  // The ammeter waits for the Electricity module; EM Fundamentals shows no numbers.
  ammeter: { name: 'Ammeter', showsNumbers: true, Readout: AmmeterReadout },
};
