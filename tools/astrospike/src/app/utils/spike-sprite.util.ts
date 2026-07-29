import {
  ARM_SPRITE_HEIGHT,
  ARM_SPRITE_WIDTH,
  GLOW_SPRITE_SIZE,
} from '../constants/render.constants';
import { StarColor } from '../models/detected-star.model';
import { SpriteCache } from '../models/spike-render-params.model';

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
 * Builds the white alpha mask of a spike arm: `ARM_SPRITE_WIDTH` x
 * `ARM_SPRITE_HEIGHT` with the arm pointing +x from the left edge, and
 * alpha(x, y) = pow(1 - x / (width - 1), falloffGamma) *
 * exp(-pow((y - centerY) / (height / 6), 2)).
 *
 * The mask carries the whole per-pixel cost of a sprite but depends only on
 * the falloff gamma, so one mask serves every star colour in a frame — see
 * {@link tintSprite}.
 */
export function buildArmMask(falloffGamma: number): HTMLCanvasElement {
  const ctx = createSpriteContext(ARM_SPRITE_WIDTH, ARM_SPRITE_HEIGHT);
  const image = ctx.createImageData(ARM_SPRITE_WIDTH, ARM_SPRITE_HEIGHT);
  const data = image.data;
  // The along-arm falloff varies only with x, so it is resolved once per
  // column rather than once per pixel: 512 pow() calls instead of 32768.
  const alongFalloff = new Float32Array(ARM_SPRITE_WIDTH);
  for (let x = 0; x < ARM_SPRITE_WIDTH; x++) {
    alongFalloff[x] = Math.pow(1 - x / (ARM_SPRITE_WIDTH - 1), falloffGamma);
  }
  const centerY = (ARM_SPRITE_HEIGHT - 1) / 2;
  const crossSigma = ARM_SPRITE_HEIGHT / 6;
  for (let y = 0; y < ARM_SPRITE_HEIGHT; y++) {
    const dy = (y - centerY) / crossSigma;
    const crossFalloff = Math.exp(-(dy * dy));
    for (let x = 0; x < ARM_SPRITE_WIDTH; x++) {
      const i = (y * ARM_SPRITE_WIDTH + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(alongFalloff[x] * crossFalloff * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  return ctx.canvas;
}

/**
 * Builds the white alpha mask of the central glow: `GLOW_SPRITE_SIZE` square
 * with a radial Gaussian falloff alpha(r) = exp(-pow(r / (size / 4), 2)) that
 * reaches ~0 at the edge. Colour-independent, so a single mask serves every
 * star — see {@link tintSprite}.
 */
export function buildGlowMask(): HTMLCanvasElement {
  const ctx = createSpriteContext(GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);
  const image = ctx.createImageData(GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);
  const data = image.data;
  const center = (GLOW_SPRITE_SIZE - 1) / 2;
  const radialSigma = GLOW_SPRITE_SIZE / 4;
  for (let y = 0; y < GLOW_SPRITE_SIZE; y++) {
    for (let x = 0; x < GLOW_SPRITE_SIZE; x++) {
      const dx = x - center;
      const dy = y - center;
      const normalized = Math.sqrt(dx * dx + dy * dy) / radialSigma;
      const i = (y * GLOW_SPRITE_SIZE + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(Math.exp(-(normalized * normalized)) * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  return ctx.canvas;
}

/**
 * Colours an alpha mask, returning a new sprite the size of the mask: the
 * star's RGB everywhere, the mask's alpha as the shape.
 *
 * This is the whole reason masks exist. Painting a sprite pixel-by-pixel per
 * star colour costs ~0.34 ms, and raising the Stars slider admits a hundred
 * unseen colours in a single frame — enough to stall a drag for 200 ms.
 * Tinting a cached mask is two GPU-side canvas operations and measures ~0.02
 * ms, which keeps the drag inside its frame budget.
 */
export function tintSprite(mask: HTMLCanvasElement, color: StarColor): HTMLCanvasElement {
  const ctx = createSpriteContext(mask.width, mask.height);
  ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
  ctx.fillRect(0, 0, mask.width, mask.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  return ctx.canvas;
}

/**
 * Builds the pre-rendered spike arm sprite for one star color, in the star's
 * colour with the {@link buildArmMask} falloff.
 */
export function buildArmSprite(color: StarColor, falloffGamma: number): HTMLCanvasElement {
  return tintSprite(buildArmMask(falloffGamma), color);
}

/**
 * Builds the pre-rendered circular glow sprite for one star color, in the
 * star's colour with the {@link buildGlowMask} radial falloff.
 */
export function buildGlowSprite(color: StarColor): HTMLCanvasElement {
  return tintSprite(buildGlowMask(), color);
}

/**
 * Empties a sprite cache, giving up each canvas's pixel buffer as it goes.
 *
 * Clearing the map alone leaves the buffers alive until the collector gets to
 * them, and a star-rich frame's worth of sprites is tens of megabytes of
 * mostly off-heap pixels — enough that the collection lands as a visible stall
 * partway through the user's next drag. Resizing each canvas to zero releases
 * that memory at the moment the image is replaced, where a pause costs
 * nothing.
 */
export function releaseSpriteCache(cache: SpriteCache): void {
  for (const canvas of cache.values()) {
    canvas.width = 0;
    canvas.height = 0;
  }
  cache.clear();
}

/**
 * Cache key for an arm alpha mask: the falloff gamma alone, since the mask is
 * colour-independent.
 */
export function armMaskCacheKey(falloffGamma: number): string {
  return `arm-mask:${falloffGamma}`;
}

/** Cache key for the one colour- and shape-independent glow alpha mask. */
export function glowMaskCacheKey(): string {
  return 'glow-mask';
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
