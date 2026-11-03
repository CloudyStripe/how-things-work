import type { ComponentType } from 'react';
import type { OverlayLayerProps } from '@/models/types';
import { EarthField } from './EarthField';
import { FieldArrows } from './FieldArrows';
import { FieldLines } from './FieldLines';

/** Each overlay's 3D layer, by overlay id. Loaded only with the lesson viewport. */
export const overlayLayers: Readonly<Record<string, ComponentType<OverlayLayerProps>>> = {
  'field-lines': FieldLines,
  'earth-field': EarthField,
  'field-arrows': FieldArrows,
};
