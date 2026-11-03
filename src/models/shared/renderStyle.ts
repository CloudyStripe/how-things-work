import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Temporary, for the style decision that opens Phase 4: the bench can render in either
// candidate style so the owner can compare them in the real lesson. Once a style is picked,
// this switch and the other style are removed.

export type RenderStyle = 'photoreal' | 'illustration';

export const RENDER_STYLES: readonly { readonly id: RenderStyle; readonly label: string }[] = [
  { id: 'photoreal', label: 'Photorealistic' },
  { id: 'illustration', label: 'Technical illustration' },
];

interface RenderStyleState {
  readonly style: RenderStyle;
  setStyle(style: RenderStyle): void;
}

export const useRenderStyle = create<RenderStyleState>()(
  persist(
    (set) => ({
      style: 'photoreal',
      setStyle: (style) => set({ style }),
    }),
    { name: 'how-things-work:style-preview' },
  ),
);
