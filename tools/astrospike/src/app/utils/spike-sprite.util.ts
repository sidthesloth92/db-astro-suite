import {
  ARM_SPRITE_HEIGHT,
  ARM_SPRITE_WIDTH,
  GLOW_SPRITE_SIZE,
} from '../constants/render.constants';
import { StarColor } from '../models/detected-star.model';

/**
 * Creates an offscreen canvas of the given size and returns its 2D context.
 * Throws when the environment cannot provide a 2D rendering context.
 */
function createSpriteContext(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('2D canvas context is unavailable for sprite rendering');
  }
  return ctx;
}

/**
 * Quantizes an 8-bit color channel to 16 levels for sprite cache keys, so
 * near-identical star colors share one pre-rendered sprite.
 */
function quantizeChannel(channel: number): number {
  return channel >> 4;
}

/**
 * Builds the pre-rendered spike arm sprite for one star color. The sprite is
 * `ARM_SPRITE_WIDTH` x `ARM_SPRITE_HEIGHT` with the arm pointing +x from the
 * left edge: alpha(x, y) = pow(1 - x / (width - 1), falloffGamma) *
 * exp(-pow((y - centerY) / (height / 6), 2)); RGB is the star color.
 */
export function buildArmSprite(color: StarColor, falloffGamma: number): HTMLCanvasElement {
  const ctx = createSpriteContext(ARM_SPRITE_WIDTH, ARM_SPRITE_HEIGHT);
  const image = ctx.createImageData(ARM_SPRITE_WIDTH, ARM_SPRITE_HEIGHT);
  const data = image.data;
  const centerY = (ARM_SPRITE_HEIGHT - 1) / 2;
  const crossSigma = ARM_SPRITE_HEIGHT / 6;
  for (let y = 0; y < ARM_SPRITE_HEIGHT; y++) {
    const dy = (y - centerY) / crossSigma;
    const crossFalloff = Math.exp(-(dy * dy));
    for (let x = 0; x < ARM_SPRITE_WIDTH; x++) {
      const alongFalloff = Math.pow(1 - x / (ARM_SPRITE_WIDTH - 1), falloffGamma);
      const i = (y * ARM_SPRITE_WIDTH + x) * 4;
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
      data[i + 3] = Math.round(alongFalloff * crossFalloff * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  return ctx.canvas;
}

/**
 * Builds the pre-rendered circular glow sprite for one star color. The sprite
 * is `GLOW_SPRITE_SIZE` square with a radial Gaussian falloff
 * alpha(r) = exp(-pow(r / (size / 4), 2)) that reaches ~0 at the edge.
 */
export function buildGlowSprite(color: StarColor): HTMLCanvasElement {
  const ctx = createSpriteContext(GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);
  const image = ctx.createImageData(GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);
  const data = image.data;
  const center = (GLOW_SPRITE_SIZE - 1) / 2;
  const radialSigma = GLOW_SPRITE_SIZE / 4;
  for (let y = 0; y < GLOW_SPRITE_SIZE; y++) {
    for (let x = 0; x < GLOW_SPRITE_SIZE; x++) {
      const dx = x - center;
      const dy = y - center;
      const r = Math.sqrt(dx * dx + dy * dy);
      const normalized = r / radialSigma;
      const alpha = Math.exp(-(normalized * normalized));
      const i = (y * GLOW_SPRITE_SIZE + x) * 4;
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
      data[i + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  return ctx.canvas;
}

/**
 * Cache key for an arm sprite: color channels quantized to 16 levels plus the
 * falloff gamma, so colors differing only in their low 4 bits share a sprite.
 */
export function armSpriteCacheKey(color: StarColor, falloffGamma: number): string {
  return `arm:${quantizeChannel(color.r)}:${quantizeChannel(color.g)}:${quantizeChannel(color.b)}:${falloffGamma}`;
}

/**
 * Cache key for a glow sprite: color channels quantized to 16 levels, so
 * colors differing only in their low 4 bits share a sprite.
 */
export function glowSpriteCacheKey(color: StarColor): string {
  return `glow:${quantizeChannel(color.r)}:${quantizeChannel(color.g)}:${quantizeChannel(color.b)}`;
}
