import {
  LIFT_BACKGROUND_BLOCK_DIVISOR,
  LIFT_BACKGROUND_BLOCK_MAX,
  LIFT_BACKGROUND_BLOCK_MIN,
  LIFT_DETECT_FLOOR,
  LIFT_DETECT_K_SIGMA,
  LIFT_FAT_BLOB_MIN_WIDTH,
  LIFT_FAT_BLOB_PEAK,
  LIFT_FAT_BLOB_WIDTH_RATIO,
  LIFT_HALO_FLOOR,
  LIFT_HALO_GROW,
  LIFT_HALO_PAD,
  LIFT_HALO_PEAK_FRACTION,
  LIFT_HALO_SIGMA,
  LIFT_MAX_RADIUS_RATIO,
  LIFT_MAX_STARS,
  LIFT_NEIGHBOUR_RISE,
} from '../constants/star-lift.constant';
import { LiftStar } from '../models/star-lift.model';
import { blurImage } from './box-blur.util';
import { estimateLocalBackground } from './local-background.util';

/**
 * Brightness of an RGBA image as the brightest channel per pixel, 0..1. The brightest channel
 * (not a weighted average) is used so strongly coloured stars are found as readily as white ones.
 */
export function brightnessOf(pixels: Uint8ClampedArray, width: number, height: number): Float32Array {
  const lum = new Float32Array(width * height);
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
    lum[i] = Math.max(pixels[p], pixels[p + 1], pixels[p + 2]) / 255;
  }
  return lum;
}

/** Background block size for an image: a fixed fraction of its short side, within limits. */
export function backgroundBlockFor(width: number, height: number): number {
  const block = Math.round(Math.min(width, height) / LIFT_BACKGROUND_BLOCK_DIVISOR);
  return Math.min(LIFT_BACKGROUND_BLOCK_MAX, Math.max(LIFT_BACKGROUND_BLOCK_MIN, block));
}

/**
 * Finds the stars in a brightness image and measures how far each one's light spreads.
 *
 * A star is a local maximum that stands clear of its local background. Walking outward ring by
 * ring gives the radius where its light has halved (`rHalf`) and the radius where it meets the
 * background or a neighbour (`rHalo`, grown a little so no rim is left behind). Wide, faint
 * blobs are nebula and are skipped.
 *
 * @returns Stars sorted brightest first, with `group` not yet assigned (-1)
 */
export function detectLiftStars(lum: Float32Array, width: number, height: number): LiftStar[] {
  const rMax = Math.round(Math.min(width, height) * LIFT_MAX_RADIUS_RATIO);
  const smooth = blurImage(lum, width, height, 1);
  const { background, sigma } = estimateLocalBackground(
    lum,
    width,
    height,
    backgroundBlockFor(width, height),
  );

  const candidates: { x: number; y: number; peak: number; index: number }[] = [];
  for (let y = 3; y < height - 3; y++) {
    for (let x = 3; x < width - 3; x++) {
      const i = y * width + x;
      const v = smooth[i];
      const excess = v - background[i];
      if (excess < Math.max(LIFT_DETECT_FLOOR, LIFT_DETECT_K_SIGMA * sigma[i])) continue;
      if (
        v < smooth[i - 1] ||
        v < smooth[i + 1] ||
        v < smooth[i - width] ||
        v < smooth[i + width] ||
        v < smooth[i - width - 1] ||
        v < smooth[i - width + 1] ||
        v < smooth[i + width - 1] ||
        v < smooth[i + width + 1]
      ) {
        continue;
      }
      // On a flat plateau keep only its top-left corner, or every plateau pixel would qualify.
      if (v === smooth[i - 1] && v === smooth[i - width]) continue;
      candidates.push({ x, y, peak: excess, index: i });
    }
  }
  candidates.sort((a, b) => b.peak - a.peak);

  const fatWidth = Math.max(LIFT_FAT_BLOB_MIN_WIDTH, width * LIFT_FAT_BLOB_WIDTH_RATIO);
  const stars: LiftStar[] = [];
  for (const candidate of candidates) {
    const base = background[candidate.index];
    const noise = sigma[candidate.index];
    const haloThreshold = Math.max(
      LIFT_HALO_SIGMA * noise,
      LIFT_HALO_FLOOR,
      LIFT_HALO_PEAK_FRACTION * candidate.peak,
    );
    let rHalf = 0;
    let rHalo = rMax;
    let darkest = candidate.peak;
    for (let r = 1; r <= rMax; r++) {
      const ring = ringMean(lum, width, height, candidate.x, candidate.y, r);
      if (ring === null) {
        rHalo = r;
        break;
      }
      const ringExcess = ring - base;
      if (rHalf === 0 && ringExcess < 0.5 * candidate.peak) rHalf = r;
      if (ringExcess < haloThreshold) {
        rHalo = r;
        break;
      }
      if (rHalf !== 0 && ringExcess > darkest * LIFT_NEIGHBOUR_RISE + noise) {
        rHalo = r - 1;
        break;
      }
      darkest = Math.min(darkest, ringExcess);
    }
    if (rHalf === 0) rHalf = rHalo;
    if (rHalf > fatWidth && candidate.peak < LIFT_FAT_BLOB_PEAK) continue;

    stars.push({
      x: candidate.x,
      y: candidate.y,
      peak: candidate.peak,
      rHalf,
      rHalo: Math.min(rMax, Math.ceil(rHalo * LIFT_HALO_GROW + LIFT_HALO_PAD)),
      group: -1,
    });
    if (stars.length >= LIFT_MAX_STARS) break;
  }
  return stars;
}

/** Mean brightness on a ring around a point, or null when the whole ring is off the image. */
function ringMean(
  lum: Float32Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): number | null {
  const samples = Math.max(8, Math.round(2 * Math.PI * radius));
  let sum = 0;
  let count = 0;
  for (let k = 0; k < samples; k++) {
    const angle = (k / samples) * 2 * Math.PI;
    const x = Math.round(cx + Math.cos(angle) * radius);
    const y = Math.round(cy + Math.sin(angle) * radius);
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    sum += lum[y * width + x];
    count++;
  }
  return count === 0 ? null : sum / count;
}
