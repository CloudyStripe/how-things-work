import type { ComponentType } from 'react';
import type { OverlayLayerProps } from '@/models/types';
import { CurrentFlow } from './CurrentFlow';
import { EarthField } from './EarthField';
import { FieldArrows } from './FieldArrows';
import { FieldLines, FluxLines } from './FieldLines';
import { GeneratorOverlay } from './GeneratorOverlay';

/** Each overlay's 3D layer, by overlay id. Loaded only with the lesson viewport. */
export const overlayLayers: Readonly<Record<string, ComponentType<OverlayLayerProps>>> = {
  'field-lines': FieldLines,
  'earth-field': EarthField,
  'current-flow': CurrentFlow,
  flux: FluxLines,
  generator: GeneratorOverlay,
  'field-arrows': FieldArrows,
};
