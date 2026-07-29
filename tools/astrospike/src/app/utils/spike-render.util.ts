import { FORCED_FLUX_FLOOR_RATIO } from '../constants/spike-geometry.constants';
import { DEFAULT_STAR_ADJUSTMENT } from '../constants/star-adjustment.constants';
import { StarColor } from '../models/detected-star.model';
import { SpikeRenderParams, SpriteCache } from '../models/spike-render-params.model';
import { computeGlowGeometry, computeSpikeGeometry } from './spike-brightness.util';
import {
  armMaskCacheKey,
  armSpriteCacheKey,
  buildArmMask,
  buildGlowMask,
  glowMaskCacheKey,
  glowSpriteCacheKey,
  tintSprite,
} from './spike-sprite.util';

/**
 * Returns the canvas cached under `key`, building and caching it on first use.
 * Masks and tinted sprites share the cache; their key prefixes keep them apart.
 */
function cachedCanvas(
  cache: SpriteCache,
  key: string,
  build: () => HTMLCanvasElement,
): HTMLCanvasElement {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const canvas = build();
  cache.set(key, canvas);
  return canvas;
}

/**
 * Returns the cached glow sprite for a star color, tinting the shared glow
 * mask on first use.
 */
function getGlowSprite(cache: SpriteCache, color: StarColor): HTMLCanvasElement {
  return cachedCanvas(cache, glowSpriteCacheKey(color), () =>
    tintSprite(cachedCanvas(cache, glowMaskCacheKey(), buildGlowMask), color),
  );
}

/**
 * Returns the cached arm sprite for a star color and falloff gamma, tinting
 * the gamma's shared arm mask on first use.
 */
function getArmSprite(
  cache: SpriteCache,
  color: StarColor,
  falloffGamma: number,
): HTMLCanvasElement {
  return cachedCanvas(cache, armSpriteCacheKey(color, falloffGamma), () =>
    tintSprite(
      cachedCanvas(cache, armMaskCacheKey(falloffGamma), () => buildArmMask(falloffGamma)),
      color,
    ),
  );
}

/**
 * Draws the embellishment for every star in `params` onto the given canvas
 * context using additive ('lighter') compositing.
 *
 * A `spikes` star gets a central glow at (x * scale, y * scale) plus
 * `spikeCount` arms rotated by the preset offset, the user rotation, and the
 * arm index. A `glow` star gets a single brightness-sized bloom and no arms.
 * The style comes from the preset unless that star's adjustment overrides it,
 * so one frame can bloom its field and spike a chosen few.
 *
 * Sprites are pulled from (or added to) `spriteCache`. The context's alpha,
 * composite operation, and transform are fully restored before returning.
 */
export function renderSpikes(
  ctx: CanvasRenderingContext2D,
  params: SpikeRenderParams,
  spriteCache: SpriteCache,
): void {
  if (params.stars.length === 0) {
    return;
  }
  ctx.save();
  try {
    ctx.globalCompositeOperation = 'lighter';
    for (const star of params.stars) {
      const glowSprite = getGlowSprite(spriteCache, star.color);
      const effectiveFlux = params.forcedStarIds.has(star.id)
        ? Math.max(star.flux, params.fluxRef * FORCED_FLUX_FLOOR_RATIO)
        : star.flux;
      // Per-star tweaks multiply the global controls, so an untouched star is
      // identical to one carrying no adjustment at all.
      const adjustment = params.adjustments.get(star.id) ?? DEFAULT_STAR_ADJUSTMENT;
      const cx = star.x * params.scale + params.offsetX;
      const cy = star.y * params.scale + params.offsetY;

      if ((adjustment.style ?? params.preset.style) === 'glow') {
        const bloom = computeGlowGeometry(
          effectiveFlux,
          params.fluxRef,
          params.preset,
          params.lengthFactor * adjustment.lengthFactor,
          params.intensityFactor * adjustment.intensityFactor,
          params.imageMaxDimension,
          params.scale,
        );
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = bloom.alpha;
        ctx.drawImage(
          glowSprite,
          cx - bloom.radiusPx,
          cy - bloom.radiusPx,
          bloom.radiusPx * 2,
          bloom.radiusPx * 2,
        );
        continue;
      }

      const armSprite = getArmSprite(spriteCache, star.color, params.preset.falloffGamma);
      const geometry = computeSpikeGeometry(
        effectiveFlux,
        params.fluxRef,
        params.preset,
        params.lengthFactor * adjustment.lengthFactor,
        params.intensityFactor * adjustment.intensityFactor,
        params.imageMaxDimension,
        params.scale,
      );

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = geometry.glowAlpha;
      ctx.drawImage(
        glowSprite,
        cx - geometry.glowRadiusPx,
        cy - geometry.glowRadiusPx,
        geometry.glowRadiusPx * 2,
        geometry.glowRadiusPx * 2,
      );

      const baseAngle =
        ((params.rotationDeg + adjustment.rotationDeg + params.preset.rotationOffsetDeg) *
          Math.PI) /
        180;
      for (let i = 0; i < params.spikeCount; i++) {
        const angle = baseAngle + (i * 2 * Math.PI) / params.spikeCount;
        ctx.setTransform(1, 0, 0, 1, cx, cy);
        ctx.rotate(angle);
        ctx.globalAlpha = geometry.alphaPeak;
        ctx.drawImage(
          armSprite,
          0,
          -geometry.thicknessPx / 2,
          geometry.lengthPx,
          geometry.thicknessPx,
        );
      }
    }
  } finally {
    ctx.restore();
  }
}
