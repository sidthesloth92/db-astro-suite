import { StarColor } from '../models/detected-star.model';
import { SpikeRenderParams, SpriteCache } from '../models/spike-render-params.model';
import { computeSpikeGeometry } from './spike-brightness.util';
import {
  armSpriteCacheKey,
  buildArmSprite,
  buildGlowSprite,
  glowSpriteCacheKey,
} from './spike-sprite.util';

/**
 * Returns the cached glow sprite for a star color, building and caching it on
 * first use.
 */
function getGlowSprite(cache: SpriteCache, color: StarColor): HTMLCanvasElement {
  const key = glowSpriteCacheKey(color);
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const sprite = buildGlowSprite(color);
  cache.set(key, sprite);
  return sprite;
}

/**
 * Returns the cached arm sprite for a star color and falloff gamma, building
 * and caching it on first use.
 */
function getArmSprite(
  cache: SpriteCache,
  color: StarColor,
  falloffGamma: number,
): HTMLCanvasElement {
  const key = armSpriteCacheKey(color, falloffGamma);
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const sprite = buildArmSprite(color, falloffGamma);
  cache.set(key, sprite);
  return sprite;
}

/**
 * Draws diffraction spikes for every star in `params` onto the given canvas
 * context using additive ('lighter') compositing. Each star gets a central
 * glow centered at (x * scale, y * scale) plus `spikeCount` arms rotated by
 * the preset offset, the user rotation, and the arm index. Sprites are pulled
 * from (or added to) `spriteCache`. The context's alpha, composite operation,
 * and transform are fully restored before returning.
 */
export function renderSpikes(
  ctx: CanvasRenderingContext2D,
  params: SpikeRenderParams,
  spriteCache: SpriteCache,
): void {
  if (params.stars.length === 0) {
    return;
  }
  let fluxRef = 0;
  for (const star of params.stars) {
    fluxRef = Math.max(fluxRef, star.flux);
  }
  ctx.save();
  try {
    ctx.globalCompositeOperation = 'lighter';
    const baseAngle = ((params.rotationDeg + params.preset.rotationOffsetDeg) * Math.PI) / 180;
    for (const star of params.stars) {
      const glowSprite = getGlowSprite(spriteCache, star.color);
      const armSprite = getArmSprite(spriteCache, star.color, params.preset.falloffGamma);
      const geometry = computeSpikeGeometry(
        star.flux,
        fluxRef,
        params.preset,
        params.lengthFactor,
        params.intensityFactor,
        params.imageMaxDimension,
        params.scale,
      );
      const cx = star.x * params.scale;
      const cy = star.y * params.scale;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = geometry.glowAlpha;
      ctx.drawImage(
        glowSprite,
        cx - geometry.glowRadiusPx,
        cy - geometry.glowRadiusPx,
        geometry.glowRadiusPx * 2,
        geometry.glowRadiusPx * 2,
      );

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
