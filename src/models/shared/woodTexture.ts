import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

// Procedural wood grain, drawn once per tone on a canvas, so no image files have to load. The
// grain runs along the texture's width (u), which the bench parts map onto their length.

export interface WoodTone {
  /** The wood's lighter colour, between the grain lines. */
  readonly light: string;
  /** The colour of the darkest grain lines. */
  readonly dark: string;
}

const SIZE = 512;
/** The value-noise grid: the largest period the noise can repeat over. */
const GRID = 256;
const canvases = new Map<string, HTMLCanvasElement>();
const textures = new Map<string, CanvasTexture>();

/**
 * A wood-grain texture for this tone, tiled `repeat` times per UV unit. Shared: parts with the
 * same tone and repeat use one texture, and every repeat of a tone draws from one canvas.
 */
export function woodTexture(tone: WoodTone, repeat: number): CanvasTexture {
  const toneKey = `${tone.light}/${tone.dark}`;
  const key = `${toneKey}x${repeat}`;
  const cached = textures.get(key);
  if (cached !== undefined) return cached;

  let canvas = canvases.get(toneKey);
  if (canvas === undefined) {
    canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext('2d');
    if (context !== null) paintGrain(context, tone);
    canvases.set(toneKey, canvas);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  textures.set(key, texture);
  return texture;
}

function paintGrain(context: CanvasRenderingContext2D, tone: WoodTone) {
  const light = hexToRgb(tone.light);
  const dark = hexToRgb(tone.dark);
  const noise = valueNoise(seededRandom(7));
  const image = context.createImageData(SIZE, SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Rings are bands across v, bent slowly along u: long, gently wavy grain lines. Every
      // term repeats across the canvas, so the texture tiles without seams.
      const bend = noise(x / 128, y / 64, 4, 8) * 10 + noise(x / 32, y / 16, 16, 32) * 2;
      const ring = 0.5 + 0.5 * Math.sin(((y + bend) / SIZE) * Math.PI * 2 * 14);
      const fine = noise(x / 8, y / 2, 64, 256) * 0.18;
      const amount = Math.min(1, Math.pow(ring, 3) * 0.75 + fine);
      const index = (y * SIZE + x) * 4;
      image.data[index] = mix(light.r, dark.r, amount);
      image.data[index + 1] = mix(light.g, dark.g, amount);
      image.data[index + 2] = mix(light.b, dark.b, amount);
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function mix(from: number, to: number, amount: number): number {
  return Math.round(from + (to - from) * amount);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

/** A small deterministic generator, so the grain is the same on every load. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Smooth 2D value noise in [0, 1], repeating every `periodX` and `periodY` units (up to 256). */
function valueNoise(
  random: () => number,
): (x: number, y: number, periodX: number, periodY: number) => number {
  const grid = Array.from({ length: GRID * GRID }, () => random());
  const smooth = (t: number) => t * t * (3 - 2 * t);

  return (x, y, periodX, periodY) => {
    const at = (gx: number, gy: number) =>
      grid[
        (((gy % periodY) + periodY) % periodY) * GRID + (((gx % periodX) + periodX) % periodX)
      ] ?? 0;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smooth(x - x0);
    const ty = smooth(y - y0);
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}
