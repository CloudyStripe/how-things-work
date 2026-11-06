import type { ExplorerLesson } from '@/engine/content/schema';
import { useSimStore } from '@/engine/sim/store';
import { TermText } from '@/glossary/TermText';
import { FAMILY_COLORS, FAMILY_NAMES, type ColorFamily } from '@/models/colors';
import { removableParts, type AnyModel } from '@/models/types';

interface ExplorerToolsProps {
  readonly lesson: ExplorerLesson;
  readonly model: AnyModel;
  readonly interactive: boolean;
}

/**
 * Taking an explorer model apart: the exploded-view slider, one part at a time, and a list of
 * parts (the keyboard's way to click one), each with a swatch of its colour family. The selected
 * part's name and description show below.
 */
export function ExplorerTools({ lesson, model, interactive }: ExplorerToolsProps) {
  const view = useSimStore((state) => state.view);
  const { setExplode, removeNextPart, putBackPart, selectPart } = useSimStore.getState();
  const removable = removableParts(model);
  const nextPart = removable[view.removedParts.length];
  const lastRemoved = view.removedParts.at(-1);
  const nameOf = (partId: string) =>
    lesson.parts.find((part) => part.part === partId)?.name ?? partId;
  const familyOf = (partId: string) => model.parts?.find((part) => part.id === partId)?.family;
  const selected = lesson.parts.find((part) => part.part === view.selectedPart);
  const families = [...new Set(lesson.parts.map((part) => familyOf(part.part)))].filter(
    (family): family is ColorFamily => family !== undefined,
  );
  const selectedFamily = selected === undefined ? undefined : familyOf(selected.part);

  return (
    <>
      <section className="panel-card">
        <h2 className="panel-heading">Take it apart</h2>
        <div className="control slider-control">
          <label className="control-label" htmlFor="explode">
            Exploded view
          </label>
          <div className="slider-row">
            <span className="slider-end">Assembled</span>
            <input
              id="explode"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={view.explode}
              disabled={!interactive}
              onChange={(event) => setExplode(Number(event.target.value))}
            />
            <span className="slider-end">Exploded</span>
          </div>
        </div>
        <div className="part-steps">
          <button
            type="button"
            className="button"
            disabled={!interactive || nextPart === undefined}
            onClick={removeNextPart}
          >
            {nextPart === undefined ? 'Every part is off' : `Remove next part: ${nameOf(nextPart)}`}
          </button>
          <button
            type="button"
            className="button-quiet"
            disabled={!interactive || lastRemoved === undefined}
            onClick={putBackPart}
          >
            {lastRemoved === undefined ? 'Put back' : `Put back: ${nameOf(lastRemoved)}`}
          </button>
        </div>
      </section>

      <section className="panel-card">
        <h2 className="panel-heading">Parts</h2>
        <ul className="part-list">
          {lesson.parts.map((part) => (
            <li key={part.part}>
              <button
                type="button"
                className="part-button"
                aria-pressed={view.selectedPart === part.part}
                disabled={!interactive}
                onClick={() => selectPart(part.part)}
              >
                <Swatch family={familyOf(part.part)} />
                {part.name}
                {view.removedParts.includes(part.part) && <span className="part-off"> (off)</span>}
              </button>
            </li>
          ))}
        </ul>
        <ul className="family-legend" aria-label="What the colours mean">
          {families.map((family) => (
            <li key={family}>
              <Swatch family={family} />
              {FAMILY_NAMES[family]}
            </li>
          ))}
        </ul>
      </section>

      {selected !== undefined && (
        <section
          className="part-card"
          aria-label={selected.name}
          style={
            selectedFamily === undefined
              ? undefined
              : { borderLeftColor: FAMILY_COLORS[selectedFamily] }
          }
        >
          <h3>{selected.name}</h3>
          {selectedFamily !== undefined && (
            <p className="part-family">{FAMILY_NAMES[selectedFamily]}</p>
          )}
          <p>
            <TermText text={selected.description} />
          </p>
          {selected.explanation !== undefined && (
            <p>
              <TermText text={selected.explanation} />
            </p>
          )}
        </section>
      )}
    </>
  );
}

function Swatch({ family }: { family: ColorFamily | undefined }) {
  if (family === undefined) return null;
  return <span className="swatch" style={{ backgroundColor: FAMILY_COLORS[family] }} aria-hidden />;
}
