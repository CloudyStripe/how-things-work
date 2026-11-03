import type { FieldSources, Vec3 } from '@/physics';

// What every model provides to the engine. A model definition is pure TypeScript (no React or
// three.js): content files and the engine import it freely. Its 3D view is registered
// separately in scenes.ts, so three.js loads only with the lesson viewport.

/** A place on a flat area: 0 to 1 from left to right (across) and from back to front (depth). */
export interface Spot {
  readonly across: number;
  readonly depth: number;
}

/**
 * A switch is on or off; a choice holds the value of one of its options; a slider, 0 to 1; a
 * spot, a place on the bench.
 */
export type ControlValue = boolean | string | number | Spot;
export type ControlValues = Readonly<Record<string, ControlValue>>;

export interface SwitchControl {
  readonly kind: 'switch';
  readonly label: string;
  readonly onLabel: string;
  readonly offLabel: string;
  readonly default: boolean;
}

export interface ChoiceControl {
  readonly kind: 'choice';
  readonly label: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly default: string;
}

/**
 * A position from 0 to 1, shown with words at each end and no numbers. A scene may also let
 * the learner drag the thing it moves.
 */
export interface SliderControl {
  readonly kind: 'slider';
  readonly label: string;
  readonly minLabel: string;
  readonly maxLabel: string;
  readonly default: number;
}

/**
 * Where something sits on the bench, such as a compass, shown with words at the edges and no
 * numbers. The scene lets the learner drag the thing it places; the side panel gives a slider
 * for each direction, so there is a keyboard way too.
 */
export interface SpotControl {
  readonly kind: 'spot';
  readonly label: string;
  /** Words for the left and right ends, then for the back and front. */
  readonly acrossLabels: readonly [string, string];
  readonly depthLabels: readonly [string, string];
  readonly default: Spot;
}

export type ControlSpec = SwitchControl | ChoiceControl | SliderControl | SpotControl;

/** Everything a frame of simulation knows: the model's state and the controls that drive it. */
export interface SimSnapshot<S, C extends ControlValues = ControlValues> {
  readonly state: S;
  readonly controls: C;
  /** Seconds since the model was loaded. */
  readonly time: number;
}

/**
 * How the learner has taken an explorer model apart: how far it is pulled out (0 to 1), which
 * parts are off (in removal order), and which part they last clicked.
 */
export interface ExplorerView {
  readonly explode: number;
  readonly removedParts: readonly string[];
  readonly selectedPart: string | null;
}

export const ASSEMBLED: ExplorerView = { explode: 0, removedParts: [], selectedPart: null };

/** A quantity an instrument or the Pattern table can show. `read` returns SI units. */
export interface Reading<S, C extends ControlValues> {
  readonly label: string;
  /** Unit shown to the learner, and the factor from SI to it (1e6 for µT). */
  readonly unit: string;
  readonly scale: number;
  readonly digits: number;
  read(snapshot: SimSnapshot<S, C>): number;
  /** Optional qualitative description, such as the current level. */
  describe?(snapshot: SimSnapshot<S, C>): string;
}

/**
 * A point a Look label pins to (metres, world space), which may move with the state. Method
 * syntax keeps the parameter bivariant, so a model can type it with its own snapshot.
 */
type Anchor<S, C extends ControlValues> = { at(snapshot: SimSnapshot<S, C>): Vec3 }['at'];

/** A piece of an explorer model. Removable parts come off in the order they are listed. */
export interface ModelPart {
  readonly id: string;
  readonly removable: boolean;
}

export interface ModelDefinition<S, C extends ControlValues> {
  readonly id: string;
  /** Accessible name for the 3D view. */
  readonly title: string;
  readonly controls: { readonly [K in keyof C]: ControlSpec };
  createState(controls: C): S;
  /** Advances the model by dt seconds. Pure: returns the next state. */
  step(snapshot: SimSnapshot<S, C>, dt: number): S;
  readonly readings: Readonly<Record<string, Reading<S, C>>>;
  /** The physics-core sources whose field the overlays draw. */
  fieldSources(snapshot: SimSnapshot<S, C>): FieldSources;
  /**
   * The level area, centred here, where field overlays draw: halfWidth along x, and halfDepth
   * along z (the same as halfWidth when not given).
   */
  readonly overlayRegion: {
    readonly center: Vec3;
    readonly halfWidth: number;
    readonly halfDepth?: number;
  };
  /** Points a Look label can pin to. */
  readonly anchors?: Readonly<Record<string, Anchor<S, C>>>;
  /** The pieces of an explorer model. */
  readonly parts?: readonly ModelPart[];
}

/** Any registered model, with its state and controls types erased. */
export type AnyModel = ModelDefinition<unknown, ControlValues>;

/** What a model's 3D scene receives: the latest frame, and ways to act on the model. */
export interface SceneProps {
  readonly getSnapshot: () => SimSnapshot<unknown>;
  readonly getView: () => ExplorerView;
  /** False during Look and while a prediction is unanswered: no dragging or clicking parts. */
  readonly interactive: boolean;
  setControl(id: string, value: ControlValue): void;
  selectPart(partId: string): void;
}

export interface OverlayLayerProps {
  readonly getSnapshot: () => SimSnapshot<unknown>;
  readonly model: AnyModel;
}

/** How a control's value reads to the learner: "Closed", "High", "Left". */
export function controlValueLabel(spec: ControlSpec, value: ControlValue | undefined): string {
  if (spec.kind === 'switch') return value === true ? spec.onLabel : spec.offLabel;
  if (spec.kind === 'slider') return Number(value) < 0.5 ? spec.minLabel : spec.maxLabel;
  if (spec.kind === 'spot') {
    const spot = isSpot(value) ? value : spec.default;
    const across = spot.across < 0.5 ? spec.acrossLabels[0] : spec.acrossLabels[1];
    const depth = spot.depth < 0.5 ? spec.depthLabels[0] : spec.depthLabels[1];
    return `${across}, ${depth}`;
  }
  return spec.options.find((option) => option.value === value)?.label ?? String(value);
}

export function isSpot(value: ControlValue | undefined): value is Spot {
  return typeof value === 'object';
}

/** The control values a model starts with. */
export function defaultControls(model: AnyModel): ControlValues {
  return Object.fromEntries(Object.entries(model.controls).map(([id, spec]) => [id, spec.default]));
}

/** The parts an explorer takes off, in order. */
export function removableParts(model: AnyModel): string[] {
  return (model.parts ?? []).filter((part) => part.removable).map((part) => part.id);
}
