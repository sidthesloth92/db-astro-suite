import {
  CLOUD_DEPTH_COARSE_RATIO,
  CLOUD_DEPTH_COARSE_WEIGHT,
  CLOUD_DEPTH_FINE_RATIO,
  CLOUD_DEPTH_GAMMA,
  CLOUD_DEPTH_HIGH_PERCENTILE,
  CLOUD_DEPTH_LOW_PERCENTILE,
  CLOUD_DEPTH_SMOOTH_RATIO,
} from '../constants/star-lift.constant';
import { blurImage } from './box-blur.util';

/**
 * Builds a depth map of the nebula from the starless photo: large, bright structure stands out
 * toward the viewer and dark sky recedes. Two blur scales are mixed so the map follows the
 * cloud's overall shape with a little of its finer relief, then normalised between two
 * brightness percentiles so a few extreme pixels cannot flatten everything else.
 *
 * (A learned depth model was tried and returns a featureless gradient on nebulae.)
 *
 * @param starless - The photo with stars filled in, RGBA
 * @returns Depth per pixel, 0 (far) to 255 (near)
 */
export function cloudDepthFromStarless(
  starless: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const count = width * height;
  const lum = new Float32Array(count);
  for (let i = 0, p = 0; i < count; i++, p += 4) {
    lum[i] = (0.2126 * starless[p] + 0.7152 * starless[p + 1] + 0.0722 * starless[p + 2]) / 255;
  }
  const coarse = blurImage(lum, width, height, Math.max(2, Math.round(width * CLOUD_DEPTH_COARSE_RATIO)));
  const fine = blurImage(lum, width, height, Math.max(1, Math.round(width * CLOUD_DEPTH_FINE_RATIO)));
  const mixed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    mixed[i] = CLOUD_DEPTH_COARSE_WEIGHT * coarse[i] + (1 - CLOUD_DEPTH_COARSE_WEIGHT) * fine[i];
  }

  const sample: number[] = [];
  for (let i = 0; i < count; i += 97) sample.push(mixed[i]);
  sample.sort((a, b) => a - b);
  const low = sample[Math.floor((sample.length - 1) * CLOUD_DEPTH_LOW_PERCENTILE)];
  const high = sample[Math.floor((sample.length - 1) * CLOUD_DEPTH_HIGH_PERCENTILE)];
  const span = Math.max(1e-5, high - low);

  const normalised = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = Math.min(1, Math.max(0, (mixed[i] - low) / span));
    normalised[i] = Math.pow(t, CLOUD_DEPTH_GAMMA);
  }
  const smooth = blurImage(normalised, width, height, Math.max(1, Math.round(width * CLOUD_DEPTH_SMOOTH_RATIO)));

  const depth = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    depth[i] = Math.round(Math.min(1, Math.max(0, smooth[i])) * 255);
  }
  return depth;
}
