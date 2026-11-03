import type { InstrumentReadoutProps } from './types';

/** The current source's ammeter: the level in words, plus the current in amps. */
export function AmmeterReadout({ name, value, unit, digits, description }: InstrumentReadoutProps) {
  return (
    <div className="instrument" role="group" aria-label={name}>
      <div className="instrument-name">{name}</div>
      <div className="instrument-reading">
        {description !== undefined && <span className="instrument-level">{description}</span>}
        <output className="instrument-value">
          {value.toFixed(digits)} {unit}
        </output>
      </div>
    </div>
  );
}
