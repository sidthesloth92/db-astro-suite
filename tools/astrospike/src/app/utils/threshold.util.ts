import { BackgroundMap, LuminanceImage } from '../models/detection.types';

/**
 * Builds a binary detection mask over a luminance plane: 1 where the
 * background-subtracted luminance strictly exceeds `kSigma` times the
 * background noise sigma, 0 otherwise (values exactly at the threshold are
 * excluded).
 */
export function thresholdMask(lum: LuminanceImage, bg: BackgroundMap, kSigma: number): Uint8Array {
  const { data } = lum;
  const { background, sigma } = bg;
  const threshold = kSigma * sigma;
  const mask = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    if (data[i] - background[i] > threshold) {
      mask[i] = 1;
    }
  }
  return mask;
}
