// Every overlay, by id: what the toggle bar shows. The 3D layers that draw them are in
// layers.ts, which loads only with the lesson viewport.

export interface OverlayInfo {
  readonly label: string;
  /** Exaggerated for visibility, so the view shows a "not to scale" tag while it is on. */
  readonly notToScale: boolean;
}

export const overlays: Readonly<Record<string, OverlayInfo>> = {
  'field-lines': { label: 'Field lines', notToScale: true },
  'earth-field': { label: "Earth's field", notToScale: true },
  'field-arrows': { label: 'Field direction', notToScale: true },
};
