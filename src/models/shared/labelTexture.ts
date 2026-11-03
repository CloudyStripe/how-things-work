import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

/**
 * A square texture with one letter painted on a colour, or on a clear background when
 * `background` is null, such as the N and S on a magnet. Drawn on a canvas, so no font file has
 * to load.
 */
export function useLetterTexture(
  letter: string,
  background: string | null,
  ink: string,
): CanvasTexture {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (context !== null) {
      if (background !== null) {
        context.fillStyle = background;
        context.fillRect(0, 0, size, size);
      }
      context.fillStyle = ink;
      context.font = `bold ${size * 0.62}px system-ui, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(letter, size / 2, size / 2 + size * 0.04);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [letter, background, ink]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
