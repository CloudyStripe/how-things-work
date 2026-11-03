import type { ComponentType } from 'react';

/** What an instrument readout shows: one model reading, already converted to display units. */
export interface InstrumentReadoutProps {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly digits: number;
  readonly description?: string;
}

export interface InstrumentInfo {
  readonly name: string;
  readonly Readout: ComponentType<InstrumentReadoutProps>;
}
