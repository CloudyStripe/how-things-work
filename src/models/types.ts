import type { StraightWire, Vec3 } from '@/physics';

// What every model provides to the engine. A model definition is pure TypeScript (no React or
// three.js): content files and the engine import it freely. Its 3D view is registered
// separately in scenes.ts, so three.js loads only with the experiment viewport.

/** A switch is on or off; a choice holds the value of one of its options. */
export type ControlValue = boolean | string;
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

export type ControlSpec = SwitchControl | ChoiceControl;

/** Everything a frame of simulation knows: the model's state and the controls that drive it. */
export interface SimSnapshot<S, C extends ControlValues = ControlValues> {
  readonly state: S;
  readonly controls: C;
  /** Seconds since the model was loaded. */
  readonly time: number;
}

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

/** The physics-core sources whose field the overlays draw. */
export interface FieldSources {
  readonly wires: readonly StraightWire[];
  readonly earth: boolean;
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
  fieldSources(snapshot: SimSnapshot<S, C>): FieldSources;
  /** Square area of the board, centred here, where field overlays draw. */
  readonly overlayRegion: { readonly center: Vec3; readonly halfWidth: number };
}

/** Any registered model, with its state and controls types erased. */
export type AnyModel = ModelDefinition<unknown, ControlValues>;

/** What a model's 3D scene and an overlay layer receive: a way to read the latest frame. */
export interface SceneProps {
  readonly getSnapshot: () => SimSnapshot<unknown>;
}

export interface OverlayLayerProps extends SceneProps {
  readonly model: AnyModel;
}

/** How a control's value reads to the learner: "Closed", "High". */
export function controlValueLabel(spec: ControlSpec, value: ControlValue | undefined): string {
  if (spec.kind === 'switch') return value === true ? spec.onLabel : spec.offLabel;
  return spec.options.find((option) => option.value === value)?.label ?? String(value);
}

/** The control values a model starts with. */
export function defaultControls(model: AnyModel): ControlValues {
  return Object.fromEntries(Object.entries(model.controls).map(([id, spec]) => [id, spec.default]));
}
