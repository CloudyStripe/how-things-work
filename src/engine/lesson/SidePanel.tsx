import type { Lesson } from '@/engine/content/schema';
import { useSimStore } from '@/engine/sim/store';
import { instruments } from '@/instruments/registry';
import { isSpot, type AnyModel, type ControlSpec } from '@/models/types';
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
        <>
          <h2 className="panel-heading">Controls</h2>
          <div className="controls">
            {lesson.controls.map((id) => {
              const spec = model.controls[id];
              return spec === undefined ? null : (
                <ControlInput key={id} id={id} spec={spec} disabled={!interactive} />
              );
            })}
          </div>
        </>
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

  if (spec.kind === 'slider') {
    return (
      <div className="control">
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
