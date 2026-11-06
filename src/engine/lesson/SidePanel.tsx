import type { Lesson } from '@/engine/content/schema';
import { useSimStore } from '@/engine/sim/store';
import { instruments } from '@/instruments/registry';
import { isSpot, type AnyModel, type ControlSpec, type ControlValue } from '@/models/types';
import { ExplorerTools } from './ExplorerTools';

interface SidePanelProps {
  readonly lesson: Lesson;
  readonly model: AnyModel;
  readonly interactive: boolean;
}

/**
 * The right panel: the controls this lesson exposes, then its instrument readouts, or for an
 * explorer, the tools for taking the model apart.
 */
export function SidePanel({ lesson, model, interactive }: SidePanelProps) {
  return (
    <aside className="lesson-side" aria-label="Controls and instruments">
      {lesson.controls.length > 0 && (
        <section className="panel-card">
          <h2 className="panel-heading">Controls</h2>
          <div className="controls">
            {lesson.controls.map((id) => {
              const spec = model.controls[id];
              return spec === undefined ? null : (
                <ControlInput key={id} id={id} spec={spec} disabled={!interactive} />
              );
            })}
          </div>
        </section>
      )}
      {lesson.kind === 'model' && lesson.instruments.length > 0 && (
        <>
          <h2 className="panel-heading">Instruments</h2>
          {lesson.instruments.map((use) => (
            <InstrumentSlot
              key={`${use.instrument}-${use.reading}`}
              instrumentId={use.instrument}
              readingId={use.reading}
              model={model}
            />
          ))}
        </>
      )}
      {lesson.kind === 'explorer' && (
        <ExplorerTools lesson={lesson} model={model} interactive={interactive} />
      )}
    </aside>
  );
}

export function ControlInput({
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

  // Both states show, with the current one filled, so it is clear what the control changes.
  if (spec.kind === 'switch') {
    return (
      <OptionsControl
        id={id}
        label={spec.label}
        options={[
          { value: false, label: spec.offLabel },
          { value: true, label: spec.onLabel },
        ]}
        current={value === true}
        disabled={disabled}
      />
    );
  }

  if (spec.kind === 'slider') {
    return (
      <div className="control slider-control">
        <label className="control-label" htmlFor={`control-${id}`}>
          {spec.label}
        </label>
        <div className="slider-row">
          <span className="slider-end">{spec.minLabel}</span>
          <input
            id={`control-${id}`}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={typeof value === 'number' ? value : spec.default}
            disabled={disabled}
            onChange={(event) => setControl(id, Number(event.target.value))}
          />
          <span className="slider-end">{spec.maxLabel}</span>
        </div>
      </div>
    );
  }

  if (spec.kind === 'spot') {
    const spot = isSpot(value) ? value : spec.default;
    const axes = [
      { axis: 'across', labels: spec.acrossLabels },
      { axis: 'depth', labels: spec.depthLabels },
    ] as const;
    return (
      <fieldset className="control spot-control" disabled={disabled}>
        <legend className="control-label">{spec.label}</legend>
        {axes.map(({ axis, labels: [minLabel, maxLabel] }) => (
          <div key={axis} className="slider-row">
            <span className="slider-end">{minLabel}</span>
            <input
              type="range"
              aria-label={`${spec.label}: ${minLabel} to ${maxLabel}`}
              min={0}
              max={1}
              step={0.01}
              value={spot[axis]}
              onChange={(event) => setControl(id, { ...spot, [axis]: Number(event.target.value) })}
            />
            <span className="slider-end">{maxLabel}</span>
          </div>
        ))}
      </fieldset>
    );
  }

  return (
    <OptionsControl
      id={id}
      label={spec.label}
      options={spec.options}
      current={value}
      disabled={disabled}
    />
  );
}

/** A control with a few named states: all of them on show, side by side, the current one filled. */
function OptionsControl({
  id,
  label,
  options,
  current,
  disabled,
}: {
  id: string;
  label: string;
  options: readonly { readonly value: boolean | string; readonly label: string }[];
  current: ControlValue | undefined;
  disabled: boolean;
}) {
  const setControl = useSimStore((state) => state.setControl);
  const labelId = `control-${id}`;
  return (
    <div className="control" role="radiogroup" aria-labelledby={labelId}>
      <span className="control-label" id={labelId}>
        {label}
      </span>
      <div className="options">
        {options.map((option) => (
          <label
            key={option.label}
            className={current === option.value ? 'option is-on' : 'option'}
          >
            <input
              type="radio"
              name={id}
              checked={current === option.value}
              disabled={disabled}
              onChange={() => setControl(id, option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
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
