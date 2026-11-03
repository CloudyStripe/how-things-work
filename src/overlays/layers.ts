import type { ComponentType } from 'react';
import type { OverlayLayerProps } from '@/models/types';
import { FieldArrows } from './FieldArrows';

/** Each overlay's 3D layer, by overlay id. Loaded only with the lesson viewport. */
export const overlayLayers: Readonly<Record<string, ComponentType<OverlayLayerProps>>> = {
  'field-arrows': FieldArrows,
};
