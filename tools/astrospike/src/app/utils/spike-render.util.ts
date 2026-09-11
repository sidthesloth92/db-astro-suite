import { FORCED_FLUX_FLOOR_RATIO } from '../constants/spike-geometry.constants';
import { DEFAULT_STAR_ADJUSTMENT } from '../constants/star-adjustment.constants';
import { StarColor } from '../models/detected-star.model';
import { SpikeRenderParams, SpriteCache } from '../models/spike-render-params.model';
import { computeHaloGeometry, computeSpikeGeometry } from './spike-brightness.util';
import {
  armMaskCacheKey,
  armSpriteCacheKey,
  buildArmMask,
  buildGlowMask,
  buildHaloMask,
  glowMaskCacheKey,
  glowSpriteCacheKey,
  haloMaskCacheKey,
  haloSpriteCacheKey,
  tintArmSprite,
  tintSprite,
  whitenColor,
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
 * Returns the cached halo sprite for a star color and Moffat beta, tinting
 * the beta's shared halo mask on first use.
 */
function getHaloSprite(cache: SpriteCache, color: StarColor, beta: number): HTMLCanvasElement {
  return cachedCanvas(cache, haloSpriteCacheKey(color, beta), () =>
    tintSprite(cachedCanvas(cache, haloMaskCacheKey(beta), () => buildHaloMask(beta)), color),
  );
}

/**
 * Returns the cached arm sprite for a star color, falloff gamma, and chroma
 * amount, tinting the gamma's shared arm mask on first use.
 */
function getArmSprite(
  cache: SpriteCache,
  color: StarColor,
  falloffGamma: number,
  chroma: number,
): HTMLCanvasElement {
  return cachedCanvas(cache, armSpriteCacheKey(color, falloffGamma, chroma), () =>
    tintArmSprite(
      cachedCanvas(cache, armMaskCacheKey(falloffGamma), () => buildArmMask(falloffGamma)),
      color,
      chroma,
    ),
  );
}

/**
 * Draws the embellishment for every star in `params` onto the given canvas
 * context.
 *
 * Each star gets, in order: a two-scale halo sized by the Glow amount — a
 * wide Moffat-tailed skirt in the star's `haloColor` under a compact hot core
 * in its `color` blended toward white — then the central glow at
 * (x * scale, y * scale) and `spikeCount` arms rotated by the preset offset,
 * the user rotation, and the arm index. Every preset draws the halo; there is
 * no other bloom.
 *
 * The skirt composites with 'screen', everything else with 'lighter'. A
 * bright star's skirt is wide and strong, and added on top of a bright
 * background it clips into a flat white disc with a hard edge; screen
 * approaches white asymptotically instead, so the skirt keeps its falloff
 * and its colour on nebula and dawn skies alike (on black the two are
 * identical). The core and the arms stay additive so a hot centre still
 * burns to white the way a real one does. The composite operation is set
 * before every draw rather than inherited from the previous one.
 *
 * Each arm is tinted along its length by `chromaFactor`, running from a cool
 * root to a red tip — diffraction separating light by wavelength.
 *
 * The spikes and the halo are independent: nothing about the arms depends on
 * the Glow amount, and nothing about the halo's size depends on the length
 * factor. Zeroing length leaves a star with only its halo; raising Glow adds
 * a halo without touching the spikes. The global Brightness scales the halo's
 * alpha alongside the arms', but a star's own brightness tweak reaches only
 * its arms. The amount comes from the global Glow control unless that star
 * names its own, so one frame can halo a chosen few stars and leave the rest
 * sharp.
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
    for (const star of params.stars) {
      const effectiveFlux = params.forcedStarIds.has(star.id)
        ? Math.max(star.flux, params.fluxRef * FORCED_FLUX_FLOOR_RATIO)
        : star.flux;
      // Per-star tweaks multiply the global controls, so an untouched star is
      // identical to one carrying no adjustment at all.
      const adjustment = params.adjustments.get(star.id) ?? DEFAULT_STAR_ADJUSTMENT;
      const cx = star.x * params.scale + params.offsetX;
      const cy = star.y * params.scale + params.offsetY;
      const amount = adjustment.glow ?? params.glowFactor;
      const haloProfile = params.preset.haloProfile;
      // A star the user pinned an amount on must visibly answer, however
      // faint it is: pinning is the halo's equivalent of forcing a star on,
      // so it earns the same flux floor. A star inside the cut is never
      // forced, and without this a pinned glow on a faint one would sit
      // under the visibility cutoff and read as the slider doing nothing.
      const haloFlux =
        adjustment.glow === null
          ? effectiveFlux
          : Math.max(effectiveFlux, params.fluxRef * FORCED_FLUX_FLOOR_RATIO);

      const halo = computeHaloGeometry(
        haloFlux,
        params.fluxRef,
        haloProfile,
        amount,
        params.intensityFactor,
        params.imageMaxDimension,
        params.scale,
      );
      // Stars under the visibility cutoff arrive here all-zero: no sprites
      // are tinted and nothing is drawn, which is what keeps a dense field's
      // thousands of faint stars free of haze.
      if (halo.haloAlpha > 0 && halo.haloRadiusPx > 0) {
        // The skirt carries the star's skirt-sampled colour, not its core
        // colour: on a bright star the core reads white, and the hue the halo
        // must show survives only in the skirt.
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = halo.haloAlpha;
        ctx.drawImage(
          getHaloSprite(spriteCache, star.haloColor, haloProfile.haloFalloffBeta),
          cx - halo.haloRadiusPx,
          cy - halo.haloRadiusPx,
          halo.haloRadiusPx * 2,
          halo.haloRadiusPx * 2,
        );
        // The hot core rides on the shared glow mask, tinted toward white —
        // the skirt underneath supplies the star's own colour at the fringe.
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = halo.coreAlpha;
        ctx.drawImage(
          getGlowSprite(spriteCache, whitenColor(star.color, haloProfile.coreWhiteness)),
          cx - halo.coreRadiusPx,
          cy - halo.coreRadiusPx,
          halo.coreRadiusPx * 2,
          halo.coreRadiusPx * 2,
        );
      }

      const geometry = computeSpikeGeometry(
        effectiveFlux,
        params.fluxRef,
        params.preset,
        params.lengthFactor * adjustment.lengthFactor,
        params.intensityFactor * adjustment.intensityFactor,
        params.imageMaxDimension,
        params.scale,
      );

      if (geometry.glowAlpha > 0 && geometry.glowRadiusPx > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = geometry.glowAlpha;
        ctx.drawImage(
          getGlowSprite(spriteCache, star.color),
          cx - geometry.glowRadiusPx,
          cy - geometry.glowRadiusPx,
          geometry.glowRadiusPx * 2,
          geometry.glowRadiusPx * 2,
        );
      }

      if (geometry.alphaPeak <= 0) {
        continue; // Length or brightness zeroed: nothing left of the arms to draw.
      }
      // Resolved only now, so a halo-only field never tints arm sprites it
      // will not use.
      const armSprite = getArmSprite(
        spriteCache,
        star.color,
        params.preset.falloffGamma,
        params.chromaFactor,
      );
      const baseAngle =
        ((params.rotationDeg + adjustment.rotationDeg + params.preset.rotationOffsetDeg) *
          Math.PI) /
        180;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = geometry.alphaPeak;
      for (let i = 0; i < params.spikeCount; i++) {
        const angle = baseAngle + (i * 2 * Math.PI) / params.spikeCount;
        ctx.setTransform(1, 0, 0, 1, cx, cy);
        ctx.rotate(angle);
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
