import {
  REFINE_ANCHOR_MIN_PEAK_FRACTION,
  REFINE_ANCHOR_RADIUS_PX,
  REFINE_CORE_PADDING_PX,
  REFINE_CORE_RADIUS_MIN_PX,
  REFINE_CORE_RADIUS_SCALE,
  REFINE_MAD_SIGMA_SCALE,
  REFINE_PLATEAU_FRACTION,
  REFINE_WEIGHT_MIN_SIGMAS,
} from '../constants/detection.constants';
import {
  HALO_COLOR_ANNULUS_MIN_INNER_PX,
  HALO_COLOR_ANNULUS_MIN_WIDTH_PX,
  HALO_COLOR_ANNULUS_OUTER_RATIO,
  HALO_COLOR_ANNULUS_PLATEAU_RATIO,
  HALO_COLOR_CLIP_LEVEL,
  HALO_COLOR_CLIP_MARGIN_PX,
  HALO_COLOR_CLIP_RING_FRACTION,
  HALO_COLOR_CLIP_SCAN_CLEAN_RINGS,
  HALO_COLOR_MIN_NOISE_SIGMA,
  HALO_COLOR_MIN_SIGNAL_SIGMAS,
  HALO_COLOR_MIN_SKIRT_FRACTION,
  HALO_COLOR_MIN_SKIRT_PIXELS,
  HALO_COLOR_SATURATION_BOOST,
  HALO_COLOR_SATURATION_MAX,
} from '../constants/halo-color.constants';
import { REC709_B, REC709_G, REC709_R } from '../constants/luminance.constants';
import { StarColor } from '../models/detected-star.model';
import { RefinedStar } from '../models/detection.types';
import { boostSaturation } from './star-color-saturation.util';

/**
 * Computes the Rec.709 luma of the RGBA pixel at flat pixel index `idx`.
 */
function lumaAt(rgba: Uint8ClampedArray, idx: number): number {
  const offset = idx * 4;
  return REC709_R * rgba[offset] + REC709_G * rgba[offset + 1] + REC709_B * rgba[offset + 2];
}

/**
 * Returns the median of a number array without mutating it. Even lengths
 * average the two central values; an empty array yields 0.
 */
function medianOf(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Whether the RGBA pixel at flat index `idx` has any channel at or above the
 * halo clip level, i.e. is blown and carries no usable hue.
 */
function isClippedAt(rgba: Uint8ClampedArray, idx: number): boolean {
  const offset = idx * 4;
  return (
    rgba[offset] >= HALO_COLOR_CLIP_LEVEL ||
    rgba[offset + 1] >= HALO_COLOR_CLIP_LEVEL ||
    rgba[offset + 2] >= HALO_COLOR_CLIP_LEVEL
  );
}

/**
 * Measures how far a blown core extends from the peak pixel, in ring radii.
 *
 * A ring is the set of window pixels whose rounded distance from the peak is
 * `r`; it counts as clipped when more than `HALO_COLOR_CLIP_RING_FRACTION` of
 * its pixels have any channel at or above `HALO_COLOR_CLIP_LEVEL`. Every ring
 * is censused in one pass over the window, then the rings are walked outward
 * from `r = 1`, recording the largest clipped one, until three consecutive
 * clean rings or the window edge end the scan. Returns 0 when not even the
 * first ring is clipped (the lone peak pixel is never a radius).
 *
 * @param rgba Row-major full-resolution RGBA bytes.
 * @param width Full-resolution image width in pixels.
 * @param peakX Peak pixel x.
 * @param peakY Peak pixel y.
 * @param x0 Left edge of the refinement window (inclusive).
 * @param y0 Top edge of the refinement window (inclusive).
 * @param x1 Right edge of the refinement window (inclusive).
 * @param y1 Bottom edge of the refinement window (inclusive).
 * @returns The clip radius in pixels, 0 when the core is unclipped.
 */
function measureClipRadius(
  rgba: Uint8ClampedArray,
  width: number,
  peakX: number,
  peakY: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  // The window edge along the longest axis is the last complete-enough ring;
  // corner pixels lie beyond it and are not censused.
  const maxRing = Math.max(peakX - x0, x1 - peakX, peakY - y0, y1 - peakY);
  const ringTotal = new Int32Array(maxRing + 1);
  const ringClipped = new Int32Array(maxRing + 1);
  for (let y = y0; y <= y1; y++) {
    const row = y * width;
    const dy = y - peakY;
    for (let x = x0; x <= x1; x++) {
      const dx = x - peakX;
      const ring = Math.round(Math.sqrt(dx * dx + dy * dy));
      if (ring > maxRing) {
        continue;
      }
      ringTotal[ring]++;
      if (isClippedAt(rgba, row + x)) {
        ringClipped[ring]++;
      }
    }
  }

  // A run of clean rings means the shoulder is behind us; a JPEG halo can
  // leave one or two rings only partially clipped on the way out.
  let clipRadius = 0;
  let cleanRun = 0;
  for (let ring = 1; ring <= maxRing; ring++) {
    if (ringClipped[ring] > ringTotal[ring] * HALO_COLOR_CLIP_RING_FRACTION) {
      clipRadius = ring;
      cleanRun = 0;
    } else if (++cleanRun >= HALO_COLOR_CLIP_SCAN_CLEAN_RINGS) {
      break;
    }
  }
  return clipRadius;
}

/**
 * Refines an approximate star position on the full-resolution RGBA image.
 *
 * A square window of `windowRadius` around the rounded approximate position
 * (clamped to the image bounds) is examined; luma is computed per pixel on
 * the fly — no full-resolution luminance plane is ever allocated. The local
 * background is the median luma of the window BORDER pixels; per-pixel
 * weights are `max(0, luma - localBackground)`.
 *
 * The centroid is anchored on the star's own peak, not the whole window: the
 * anchor is the brightest pixel near the approximate position (falling back
 * to the window's global peak only when nothing bright sits nearby), the core
 * region is sized from the near-peak plateau's pixel count, and the sub-pixel
 * centroid is computed only over that core disc. Centroiding the whole window
 * lets a star's own (usually asymmetric) diffraction arms and bright
 * neighbours drag the centre off the core; sizing the core from pixel
 * distances lets one bright noise pixel balloon it back into a whole-window
 * centroid — both render spikes visibly misaligned on real telescope data.
 *
 * The star color is the luma-weighted mean RGB over that same core region's
 * pixels whose weight exceeds 50% of the peak, excluding pixels with any
 * channel at 255 whenever at least one unsaturated qualifying pixel exists,
 * then normalized so the brightest channel is 255. When no pixel qualifies
 * (or the window is empty) the color falls back to white and the approximate
 * position is returned unchanged.
 *
 * The halo color is sampled where a bright star's hue actually survives: the
 * skirt annulus outside the blown core. The annulus starts just past the
 * measured clip radius (plus a margin for the partially clipped shoulder)
 * and past the unpadded near-peak plateau — deliberately NOT a multiple of
 * the padded core radius, which would put a tiny star's annulus out on the
 * sky — and reaches a few core radii out. It skips any pixel with a clipped
 * channel, keeps only pixels that rise HALO_COLOR_MIN_SIGNAL_SIGMAS sky
 * sigmas above the local background, takes the sky off as a neutral luma
 * pedestal from every channel alike (per-channel subtraction turns a blue
 * star in a blue nebula orange), luma-weights what is left, normalizes the
 * brightest channel to 255, and boosts saturation with the hue held fixed.
 * The sample is trusted only when it fills a real band of the annulus; when
 * it does not, the boosted core color stands in, so a faint star still glows
 * in its own hue and never in grey noise; when there is no core color
 * either, the halo is white.
 *
 * @param rgba Row-major full-resolution RGBA bytes, length = width * height * 4.
 * @param width Full-resolution image width in pixels.
 * @param height Full-resolution image height in pixels.
 * @param approxX Approximate star x in full-resolution pixels.
 * @param approxY Approximate star y in full-resolution pixels.
 * @param windowRadius Half-size of the refinement window in pixels.
 * @returns Refined sub-pixel centroid, background-subtracted peak, core color,
 *   and skirt-sampled halo color.
 */
export function refineStar(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  approxX: number,
  approxY: number,
  windowRadius: number,
): RefinedStar {
  const whiteFallback: StarColor = { r: 255, g: 255, b: 255 };
  const centerX = Math.round(approxX);
  const centerY = Math.round(approxY);
  const x0 = Math.max(0, centerX - windowRadius);
  const x1 = Math.min(width - 1, centerX + windowRadius);
  const y0 = Math.max(0, centerY - windowRadius);
  const y1 = Math.min(height - 1, centerY + windowRadius);
  if (x1 < x0 || y1 < y0) {
    return { x: approxX, y: approxY, peak: 0, color: whiteFallback, haloColor: whiteFallback };
  }

  // Local background: median luma of the window border pixels.
  const borderLumas: number[] = [];
  const pushBorder = (idx: number): void => {
    borderLumas.push(lumaAt(rgba, idx));
  };
  for (let x = x0; x <= x1; x++) {
    pushBorder(y0 * width + x);
    if (y1 !== y0) {
      pushBorder(y1 * width + x);
    }
  }
  for (let y = y0 + 1; y < y1; y++) {
    pushBorder(y * width + x0);
    if (x1 !== x0) {
      pushBorder(y * width + x1);
    }
  }
  const localBackground = medianOf(borderLumas);
  // Robust local noise from the same border ring, for the centroid's weight
  // floor below and the skirt colour's signal gate.
  const borderDeviations = borderLumas.map((value) => Math.abs(value - localBackground));
  const noiseSigma = REFINE_MAD_SIGMA_SCALE * medianOf(borderDeviations);
  const noiseFloor = REFINE_WEIGHT_MIN_SIGMAS * noiseSigma;

  // Pass 1: locate the anchor peak. The search prefers the neighbourhood of
  // the approximate position — detection's centroid is at worst a few pixels
  // off its own star, so the true peak is close by. Searching the whole
  // window unconditionally lets a brighter neighbour star capture the anchor
  // and drag the refined centre off this star entirely.
  let globalPeak = 0;
  let globalPeakX = centerX;
  let globalPeakY = centerY;
  let nearPeak = 0;
  let nearPeakX = centerX;
  let nearPeakY = centerY;
  const anchorRadiusSq = REFINE_ANCHOR_RADIUS_PX * REFINE_ANCHOR_RADIUS_PX;
  for (let y = y0; y <= y1; y++) {
    const row = y * width;
    for (let x = x0; x <= x1; x++) {
      const w = Math.max(0, lumaAt(rgba, row + x) - localBackground);
      if (w > globalPeak) {
        globalPeak = w;
        globalPeakX = x;
        globalPeakY = y;
      }
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= anchorRadiusSq && w > nearPeak) {
        nearPeak = w;
        nearPeakX = x;
        nearPeakY = y;
      }
    }
  }
  const anchorIsTrustworthy = nearPeak >= globalPeak * REFINE_ANCHOR_MIN_PEAK_FRACTION;
  const peak = anchorIsTrustworthy ? nearPeak : globalPeak;
  const peakX = anchorIsTrustworthy ? nearPeakX : globalPeakX;
  const peakY = anchorIsTrustworthy ? nearPeakY : globalPeakY;

  // Pass 2: size the core region from the near-peak plateau's pixel COUNT
  // (area-equivalent radius). Sizing it from pixel distances instead lets one
  // bright noise pixel or a similar-brightness neighbour anywhere in the
  // window balloon the core back into a whole-window centroid — which is what
  // renders markers floating between stars.
  const plateauThreshold = peak * REFINE_PLATEAU_FRACTION;
  let plateauCount = 0;
  if (peak > 0) {
    for (let y = y0; y <= y1; y++) {
      const row = y * width;
      for (let x = x0; x <= x1; x++) {
        const w = lumaAt(rgba, row + x) - localBackground;
        if (w >= plateauThreshold) {
          plateauCount++;
        }
      }
    }
  }
  const plateauEquivalentRadius = Math.sqrt(plateauCount / Math.PI);
  const coreRadius = Math.min(
    windowRadius,
    Math.max(
      REFINE_CORE_RADIUS_MIN_PX,
      Math.ceil(REFINE_CORE_RADIUS_SCALE * plateauEquivalentRadius) + REFINE_CORE_PADDING_PX,
    ),
  );
  const coreRadiusSq = coreRadius * coreRadius;

  // Pass 3: weighted centroid over the core region around the peak only.
  // Weights below the local noise floor are dropped entirely: rectified noise
  // contributes ~0.4 sigma per background pixel, and for a faint star the
  // disc holds far more background than star — that pedestal's centroid IS
  // the disc's integer anchor, so leaving it in re-quantizes the sub-pixel
  // position detection already had.
  let weightSum = 0;
  let weightedX = 0;
  let weightedY = 0;
  const cx0 = Math.max(x0, peakX - coreRadius);
  const cx1 = Math.min(x1, peakX + coreRadius);
  const cy0 = Math.max(y0, peakY - coreRadius);
  const cy1 = Math.min(y1, peakY + coreRadius);
  for (let y = cy0; y <= cy1; y++) {
    const row = y * width;
    const dy = y - peakY;
    for (let x = cx0; x <= cx1; x++) {
      const dx = x - peakX;
      if (dx * dx + dy * dy > coreRadiusSq) {
        continue;
      }
      const w = lumaAt(rgba, row + x) - localBackground;
      if (w <= noiseFloor) {
        continue;
      }
      weightSum += w;
      weightedX += w * x;
      weightedY += w * y;
    }
  }
  const refinedX = weightSum > 0 ? weightedX / weightSum : approxX;
  const refinedY = weightSum > 0 ? weightedY / weightSum : approxY;

  // Pass 4 — color: luma-weighted mean RGB over bright core pixels, preferring
  // unsaturated pixels (no channel at 255) when any exist.
  const coreThreshold = peak * 0.5;
  let allW = 0;
  let allR = 0;
  let allG = 0;
  let allB = 0;
  let unsatW = 0;
  let unsatR = 0;
  let unsatG = 0;
  let unsatB = 0;
  for (let y = cy0; y <= cy1; y++) {
    const row = y * width;
    const dy = y - peakY;
    for (let x = cx0; x <= cx1; x++) {
      const dx = x - peakX;
      if (dx * dx + dy * dy > coreRadiusSq) {
        continue;
      }
      const idx = row + x;
      const w = Math.max(0, lumaAt(rgba, idx) - localBackground);
      if (w <= 0 || w <= coreThreshold) {
        continue;
      }
      const offset = idx * 4;
      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];
      allW += w;
      allR += w * r;
      allG += w * g;
      allB += w * b;
      if (r !== 255 && g !== 255 && b !== 255) {
        unsatW += w;
        unsatR += w * r;
        unsatG += w * g;
        unsatB += w * b;
      }
    }
  }

  const chosenW = unsatW > 0 ? unsatW : allW;
  let color = whiteFallback;
  if (chosenW > 0) {
    const meanR = (unsatW > 0 ? unsatR : allR) / chosenW;
    const meanG = (unsatW > 0 ? unsatG : allG) / chosenW;
    const meanB = (unsatW > 0 ? unsatB : allB) / chosenW;
    const maxChannel = Math.max(meanR, meanG, meanB);
    if (maxChannel > 0) {
      const scaleToFull = 255 / maxChannel;
      color = {
        r: Math.round(meanR * scaleToFull),
        g: Math.round(meanG * scaleToFull),
        b: Math.round(meanB * scaleToFull),
      };
    }
  }

  // Pass 5 — halo color: luma-weighted, sky-subtracted mean RGB over the
  // unclipped skirt annulus. The annulus starts just past the blown core's
  // clip radius plus a shoulder margin — NOT at a multiple of the core
  // radius, which on a tiny unclipped star would put it out on the sky where
  // there is only grey noise to sample — and reaches a few core radii out;
  // the window bounds clip whatever does not fit. Pixels must rise several
  // noise sigmas above the local sky to count, so the sample is the star's
  // own wings and never the noise between stars. The sky is taken off as a
  // NEUTRAL pedestal (the border's luma from every channel alike), never per
  // channel: subtracting a blue reflection nebula channel by channel strips
  // the blue out of a blue star's glare and hands it an orange halo.
  const clipRadius = measureClipRadius(rgba, width, peakX, peakY, x0, y0, x1, y1);
  const innerRadius = Math.max(
    clipRadius + HALO_COLOR_CLIP_MARGIN_PX,
    Math.ceil(HALO_COLOR_ANNULUS_PLATEAU_RATIO * plateauEquivalentRadius) + 1,
    HALO_COLOR_ANNULUS_MIN_INNER_PX,
  );
  const outerRadius = Math.max(
    coreRadius * HALO_COLOR_ANNULUS_OUTER_RATIO,
    innerRadius + HALO_COLOR_ANNULUS_MIN_WIDTH_PX,
  );
  const innerRadiusSq = innerRadius * innerRadius;
  const outerRadiusSq = outerRadius * outerRadius;
  const reach = Math.ceil(outerRadius);
  const sx0 = Math.max(x0, peakX - reach);
  const sx1 = Math.min(x1, peakX + reach);
  const sy0 = Math.max(y0, peakY - reach);
  const sy1 = Math.min(y1, peakY + reach);
  const skirtFloor = HALO_COLOR_MIN_SIGNAL_SIGMAS * Math.max(noiseSigma, HALO_COLOR_MIN_NOISE_SIGMA);
  let annulusPixels = 0;
  let skirtPixels = 0;
  let skirtW = 0;
  let skirtR = 0;
  let skirtG = 0;
  let skirtB = 0;
  for (let y = sy0; y <= sy1; y++) {
    const row = y * width;
    const dy = y - peakY;
    for (let x = sx0; x <= sx1; x++) {
      const dx = x - peakX;
      const distSq = dx * dx + dy * dy;
      if (distSq < innerRadiusSq || distSq > outerRadiusSq) {
        continue;
      }
      annulusPixels++;
      const idx = row + x;
      if (isClippedAt(rgba, idx)) {
        continue;
      }
      const w = lumaAt(rgba, idx) - localBackground;
      if (w <= 0 || w <= skirtFloor) {
        continue;
      }
      const offset = idx * 4;
      skirtPixels++;
      skirtW += w;
      skirtR += w * Math.max(0, rgba[offset] - localBackground);
      skirtG += w * Math.max(0, rgba[offset + 1] - localBackground);
      skirtB += w * Math.max(0, rgba[offset + 2] - localBackground);
    }
  }

  // A trusted skirt is a band, not a scatter: it must clear both the pixel
  // floor and a share of the annulus that sky noise alone never reaches.
  const skirtTrusted =
    skirtPixels >= HALO_COLOR_MIN_SKIRT_PIXELS &&
    skirtPixels >= HALO_COLOR_MIN_SKIRT_FRACTION * annulusPixels;
  let skirtColor: StarColor | null = null;
  if (skirtTrusted && skirtW > 0) {
    const meanR = skirtR / skirtW;
    const meanG = skirtG / skirtW;
    const meanB = skirtB / skirtW;
    const maxChannel = Math.max(meanR, meanG, meanB);
    if (maxChannel > 0) {
      const scaleToFull = 255 / maxChannel;
      skirtColor = { r: meanR * scaleToFull, g: meanG * scaleToFull, b: meanB * scaleToFull };
    }
  }
  const haloColor = boostSaturation(
    skirtColor ?? color,
    HALO_COLOR_SATURATION_BOOST,
    HALO_COLOR_SATURATION_MAX,
  );

  return { x: refinedX, y: refinedY, peak, color, haloColor };
}
