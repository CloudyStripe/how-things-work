import { create } from 'zustand';
import {
  ASSEMBLED,
  defaultControls,
  removableParts,
  type AnyModel,
  type ControlValue,
  type ExplorerView,
  type SimSnapshot,
} from '@/models/types';

// The running simulation: one model, its controls and state, how an explorer model has been
// taken apart, and which overlays are on. Not persisted; it starts fresh each time a lesson
// opens.

/** Longest step (s) one frame may take, so a stalled tab does not jump the simulation. */
export const MAX_FRAME = 1 / 30;

interface SimStore {
  model: AnyModel | null;
  snapshot: SimSnapshot<unknown> | null;
  view: ExplorerView;
  overlays: readonly string[];
  /** Starts a model from its default controls, assembled, with every overlay off. */
  load(model: AnyModel): void;
  /** Puts the model back as it started (controls, state and parts), keeping the overlays. */
  reset(): void;
  setControl(id: string, value: ControlValue): void;
  /** Steps the model forward by dt seconds (capped at one MAX_FRAME). */
  advance(dt: number): void;
  setOverlay(id: string, on: boolean): void;
  setExplode(amount: number): void;
  /** Takes off the next removable part, if any are left. */
  removeNextPart(): void;
  /** Puts back the part that came off last. */
  putBackPart(): void;
  selectPart(partId: string | null): void;
}

function startingSnapshot(model: AnyModel): SimSnapshot<unknown> {
  const controls = defaultControls(model);
  return { state: model.createState(controls), controls, time: 0 };
}

export const useSimStore = create<SimStore>()((set, get) => ({
  model: null,
  snapshot: null,
  view: ASSEMBLED,
  overlays: [],

  load(model) {
    set({ model, snapshot: startingSnapshot(model), view: ASSEMBLED, overlays: [] });
  },

  reset() {
    const { model } = get();
    if (model === null) return;
    set({ snapshot: startingSnapshot(model), view: ASSEMBLED });
  },

  setControl(id, value) {
    const { snapshot } = get();
    if (snapshot === null) return;
    set({ snapshot: { ...snapshot, controls: { ...snapshot.controls, [id]: value } } });
  },

  advance(dt) {
    const { model, snapshot } = get();
    if (model === null || snapshot === null || dt <= 0) return;
    const step = Math.min(dt, MAX_FRAME);
    set({
      snapshot: {
        state: model.step(snapshot, step),
        controls: snapshot.controls,
        time: snapshot.time + step,
      },
    });
  },

  setOverlay(id, on) {
    const others = get().overlays.filter((overlay) => overlay !== id);
    set({ overlays: on ? [...others, id] : others });
  },

  setExplode(amount) {
    set({ view: { ...get().view, explode: Math.min(1, Math.max(0, amount)) } });
  },

  removeNextPart() {
    const { model, view } = get();
    if (model === null) return;
    const next = removableParts(model)[view.removedParts.length];
    if (next === undefined) return;
    set({ view: { ...view, removedParts: [...view.removedParts, next] } });
  },

  putBackPart() {
    const { view } = get();
    if (view.removedParts.length === 0) return;
    set({ view: { ...view, removedParts: view.removedParts.slice(0, -1) } });
  },

  selectPart(partId) {
    set({ view: { ...get().view, selectedPart: partId } });
  },
}));
