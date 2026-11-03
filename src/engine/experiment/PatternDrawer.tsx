import type { Experiment } from '@/engine/content/schema';
import type { AnyModel } from '@/models/types';
import type { PatternRow } from './useExperimentRunner';

type Pattern = NonNullable<Experiment['steps']['pattern']>;

interface PatternDrawerProps {
  readonly pattern: Pattern;
  readonly model: AnyModel;
  readonly rows: readonly PatternRow[];
}

/** The bottom drawer during Pattern: one row per setting of the varied control. */
export function PatternDrawer({ pattern, model, rows }: PatternDrawerProps) {
  const control = model.controls[pattern.control];
  const reading = model.readings[pattern.reading];
  if (control === undefined || reading === undefined) return null;

  return (
    <section className="experiment-drawer" aria-label="Readings">
      <table className="readings-table">
        <caption>Readings</caption>
        <thead>
          <tr>
            <th scope="col">{control.label}</th>
            <th scope="col">
              {reading.label} ({reading.unit})
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2}>No readings yet.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.value}>
                <td>{row.label}</td>
                <td>{row.reading.toFixed(reading.digits)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
