import {
  LIFT_BACKGROUND_BLOCK_DIVISOR,
  LIFT_BACKGROUND_BLOCK_MAX,
  LIFT_BACKGROUND_BLOCK_MIN,
  LIFT_DETECT_FLOOR,
  LIFT_DETECT_K_SIGMA,
  LIFT_FAT_BLOB_MIN_WIDTH,
  LIFT_FAT_BLOB_PEAK,
  LIFT_FAT_BLOB_STAR_WIDTHS,
  LIFT_FAT_BLOB_WIDTH_RATIO,
  LIFT_HALO_GROW,
  LIFT_HALO_PAD,
  LIFT_MAX_RADIUS_RATIO,
  LIFT_MAX_STARS,
  LIFT_MIN_ROUNDNESS,
  LIFT_PLATEAU_TOLERANCE,
  LIFT_ROUNDNESS_MIN_REACH,
} from '../constants/star-lift.constant';
import { RingProfile } from '../models/ring-profile.model';
import { LiftStar } from '../models/star-lift.model';
import { blurImage } from './box-blur.util';
import { estimateLocalBackground } from './local-background.util';
import { measureStarSpread } from './star-spread.util';

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
 * ring gives the radius where its light has halved (`rHalf`) and the radius where it ends
 * (`rHalo`, grown a little so no rim is left behind). Soft clumps far wider than the photo's
 * stars and bright spots on a filament are nebula and are skipped.
 *
 * @returns Stars sorted brightest first
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
  // Pixels already examined as part of a flat top, so each one is looked at once.
  const plateauSeen = new Uint8Array(width * height);
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
      // A burnt-out core is a flat top where every pixel ties with its neighbours. It is one
      // star, placed at the middle of the flat top, not one star per tied pixel.
      if (plateauSeen[i] !== 0) continue;
      const centre = plateauCentre(smooth, width, height, i, plateauSeen);
      if (centre === null) continue;
      candidates.push({
        x: centre % width,
        y: (centre / width) | 0,
        peak: v - background[centre],
        index: centre,
      });
    }
  }
  candidates.sort((a, b) => b.peak - a.peak);

  const fatWidth = Math.max(LIFT_FAT_BLOB_MIN_WIDTH, width * LIFT_FAT_BLOB_WIDTH_RATIO);
  const stars: LiftStar[] = [];
  const rings = new RingProfile(lum, width, height, rMax);
  // Pixels inside an accepted star's core. A second peak there (the far corner of an oddly
  // shaped plateau, say) is the same star and must not be lifted or redrawn twice.
  const claimed = new Uint8Array(width * height);
  for (const candidate of candidates) {
    if (claimed[candidate.index] !== 0) continue;
    rings.centreOn(candidate.x, candidate.y);
    const { rHalf, rEnd, roundness } = measureStarSpread(
      rings,
      {
        peak: candidate.peak,
        background: background[candidate.index],
        noise: sigma[candidate.index],
      },
      rMax,
    );
    if (rHalf > fatWidth && candidate.peak < LIFT_FAT_BLOB_PEAK) continue;
    if (rEnd >= LIFT_ROUNDNESS_MIN_REACH && roundness < LIFT_MIN_ROUNDNESS) continue;

    stars.push({
      x: candidate.x,
      y: candidate.y,
      peak: candidate.peak,
      rHalf,
      rHalo: Math.min(rMax, Math.ceil(rEnd * LIFT_HALO_GROW + LIFT_HALO_PAD)),
    });
    claimCore(claimed, width, height, candidate.x, candidate.y, Math.max(1, rHalf));
    if (stars.length >= LIFT_MAX_STARS) break;
  }
  return withoutWideBlobs(stars);
}

/**
 * Drops faint detections far wider than the photo's own stars. Stars in one photo are all about
 * the same width until they burn out, so the typical width is a better yardstick than any fixed
 * size: a soft clump of nebula is several stars wide however the photo was sampled.
 */
function withoutWideBlobs(stars: LiftStar[]): LiftStar[] {
  if (stars.length === 0) return stars;
  const widths = stars.map((star) => star.rHalf).sort((a, b) => a - b);
  const widest = Math.max(
    LIFT_FAT_BLOB_MIN_WIDTH,
    LIFT_FAT_BLOB_STAR_WIDTHS * widths[widths.length >> 1],
  );
  return stars.filter((star) => star.rHalf <= widest || star.peak >= LIFT_FAT_BLOB_PEAK);
}

/**
 * Finds the middle of the flat top that a local maximum belongs to. A sharp peak is its own
 * flat top. Every pixel of the flat top is marked in `seen`.
 *
 * @returns Index of the pixel at the middle, or null when the flat area is not a peak at all
 * (a level shoulder beside something brighter)
 */
function plateauCentre(
  smooth: Float32Array,
  width: number,
  height: number,
  start: number,
  seen: Uint8Array,
): number | null {
  const level = smooth[start];
  const stack = [start];
  seen[start] = 1;
  let isPeak = true;
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
    const x = i % width;
    const y = (i / width) | 0;
    count++;
    sumX += x;
    sumY += y;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        if ((dx === 0 && dy === 0) || nx < 0 || nx >= width) continue;
        const n = ny * width + nx;
        if (smooth[n] > level + LIFT_PLATEAU_TOLERANCE) {
          isPeak = false;
        } else if (seen[n] === 0 && smooth[n] >= level - LIFT_PLATEAU_TOLERANCE) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
  }
  return isPeak ? Math.round(sumY / count) * width + Math.round(sumX / count) : null;
}

/** Marks the disc of an accepted star's core so later candidates inside it are skipped. */
function claimCore(
  claimed: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= height) continue;
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= width || dx * dx + dy * dy > radius * radius) continue;
      claimed[y * width + x] = 1;
    }
  }
}
