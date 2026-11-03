import type { Experiment } from '@/engine/content/schema';
import { useSimStore } from '@/engine/sim/store';
import { instruments } from '@/instruments/registry';
import type { AnyModel, ControlSpec } from '@/models/types';

interface SidePanelProps {
  readonly experiment: Experiment;
  readonly model: AnyModel;
  readonly unlocked: boolean;
}

/** The right panel: the controls this experiment exposes, then its instrument readouts. */
export function SidePanel({ experiment, model, unlocked }: SidePanelProps) {
  return (
    <aside className="experiment-side" aria-label="Controls and instruments">
      <h2 className="panel-heading">Controls</h2>
      <div className="controls">
        {experiment.controls.map((id) => {
          const spec = model.controls[id];
          return spec === undefined ? null : (
            <ControlInput key={id} id={id} spec={spec} disabled={!unlocked} />
          );
        })}
      </div>
      {experiment.instruments.length > 0 && (
        <>
          <h2 className="panel-heading">Instruments</h2>
          {experiment.instruments.map((use) => (
            <InstrumentSlot
              key={`${use.instrument}-${use.reading}`}
              instrumentId={use.instrument}
              readingId={use.reading}
              model={model}
            />
          ))}
        </>
      )}
    </aside>
  );
}

function ControlInput({
  id,
  spec,
  disabled,
}: {
  id: string;
  spec: ControlSpec;
  disabled: boolean;
}) {
  const value = useSimStore((state) => state.snapshot?.controls[id]);
  const setControl = useSimStore((state) => state.setControl);

  if (spec.kind === 'switch') {
    const on = value === true;
    return (
      <div className="control">
        <span className="control-label">{spec.label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={spec.label}
          className={on ? 'switch is-on' : 'switch'}
          disabled={disabled}
          onClick={() => setControl(id, !on)}
        >
          {on ? spec.onLabel : spec.offLabel}
        </button>
      </div>
    );
  }

  return (
    <fieldset className="control" disabled={disabled}>
      <legend className="control-label">{spec.label}</legend>
      <div className="choice-row">
        {spec.options.map((option) => (
          <label key={option.value} className="choice-option">
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => setControl(id, option.value)}
            />{' '}
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function InstrumentSlot({
  instrumentId,
  readingId,
  model,
}: {
  instrumentId: string;
  readingId: string;
  model: AnyModel;
}) {
  const instrument = instruments[instrumentId];
  const reading = model.readings[readingId];
  const value = useSimStore((state) =>
    state.snapshot !== null && reading !== undefined
      ? reading.read(state.snapshot) * reading.scale
      : 0,
  );
  const description = useSimStore((state) =>
    state.snapshot !== null && reading?.describe !== undefined
      ? reading.describe(state.snapshot)
      : undefined,
  );
  if (instrument === undefined || reading === undefined) return null;

  const { Readout } = instrument;
  return (
    <Readout
      name={instrument.name}
      value={value}
      unit={reading.unit}
      digits={reading.digits}
      description={description}
    />
  );
}
