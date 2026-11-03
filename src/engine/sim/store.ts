import { create } from 'zustand';
import {
  defaultControls,
  type AnyModel,
  type ControlValue,
  type SimSnapshot,
} from '@/models/types';

// The running simulation: one model, its controls and state, and which overlays are on. Not
// persisted; it starts fresh each time an experiment opens.

/** Longest step (s) one frame may take, so a stalled tab does not jump the simulation. */
export const MAX_FRAME = 1 / 30;

interface SimStore {
  model: AnyModel | null;
  snapshot: SimSnapshot<unknown> | null;
  overlays: readonly string[];
  /** Starts a model from its default controls, with every overlay off. */
  load(model: AnyModel): void;
  setControl(id: string, value: ControlValue): void;
  /** Steps the model forward by dt seconds (capped at one MAX_FRAME). */
  advance(dt: number): void;
  setOverlay(id: string, on: boolean): void;
}

export const useSimStore = create<SimStore>()((set, get) => ({
  model: null,
  snapshot: null,
  overlays: [],

  load(model) {
    const controls = defaultControls(model);
    set({
      model,
      snapshot: { state: model.createState(controls), controls, time: 0 },
      overlays: [],
    });
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
}));
