import { placeholderWireCompass } from './placeholder-wire-compass/definition';
import type { AnyModel } from './types';

/** Every model, by id. Content files name a model by its id. */
export const models: Readonly<Record<string, AnyModel>> = {
  [placeholderWireCompass.id]: placeholderWireCompass,
};
