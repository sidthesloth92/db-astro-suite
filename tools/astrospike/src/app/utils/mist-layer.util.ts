import { MIST_BLUR_PASSES } from '../constants/mist.constants';
import { MistDrawRegion, MistProfile } from '../models/mist-profile.model';
import { boxBlurPlane } from './box-blur.util';
import { SRGB_TO_LINEAR, linearToSrgbByte } from './linear-light.util';

/**
 * Creates a 2D context on a fresh canvas of the given size.
 */
function createLayerContext(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (ctx === null) {
    throw new Error('2D canvas context is unavailable for mist rendering');
  }
  return ctx;
}

/**
 * Builds the mist layer of an image: its highlights above the profile's
 * threshold, spread by the profile's blur scales, re-saturated, and written
 * as opaque sRGB on black. Screen the result over the image at the Mist
 * amount — see {@link drawMistLayer} — and the bright regions glow into
 * their surroundings while anything under the threshold adds nothing.
 *
 * The work happens on a small copy no larger than the profile's working
 * dimension, in linear light: a mist several percent of the frame wide
 * carries no detail a few hundred pixels cannot hold, and blurring in gamma
 * space would grey the haze. The returned canvas is that small copy; the
 * draw pass scales it up, and a blur upscales cleanly.
 *
 * Deterministic in the image and profile alone, so callers cache it and
 * rebuild only when either changes; the amount is applied at draw time.
 *
 * @param source The image to mist, at any resolution.
 * @param sourceWidth Width of `source` in pixels.
 * @param sourceHeight Height of `source` in pixels.
 * @param profile Threshold, scales, and gain to apply.
 * @returns The mist light on black, at the working size.
 */
export function buildMistLayer(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  profile: MistProfile,
): HTMLCanvasElement {
  const shrink = Math.min(1, profile.workMaxDimension / Math.max(1, sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * shrink));
  const height = Math.max(1, Math.round(sourceHeight * shrink));
  const ctx = createLayerContext(width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const count = width * height;

  // Highlights in linear light: each pixel's colour weighted by how far its
  // luminance rises above the threshold, so dark sky contributes nothing
  // and the knee keeps mid-tones from fogging the whole frame.
  const red = new Float32Array(count);
  const green = new Float32Array(count);
  const blue = new Float32Array(count);
  const span = Math.max(1e-6, 1 - profile.thresholdLinear);
  for (let i = 0; i < count; i++) {
    const offset = i * 4;
    const r = SRGB_TO_LINEAR[data[offset]];
    const g = SRGB_TO_LINEAR[data[offset + 1]];
    const b = SRGB_TO_LINEAR[data[offset + 2]];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma <= profile.thresholdLinear) {
      continue;
    }
    const weight = Math.pow((luma - profile.thresholdLinear) / span, profile.kneePower);
    red[i] = r * weight;
    green[i] = g * weight;
    blue[i] = b * weight;
  }

  // Sum of the blur scales, each a Gaussian-like box stack at its own radius.
  const mistRed = new Float32Array(count);
  const mistGreen = new Float32Array(count);
  const mistBlue = new Float32Array(count);
  const largest = Math.max(width, height);
  profile.radiusScales.forEach((scale, index) => {
    const radius = Math.max(1, Math.round(largest * scale));
    const weight = profile.radiusWeights[index] ?? 0;
    if (weight <= 0) {
      return;
    }
    const planes = [red, green, blue].map((plane) =>
      boxBlurPlane(plane, width, height, radius, MIST_BLUR_PASSES),
    );
    for (let i = 0; i < count; i++) {
      mistRed[i] += planes[0][i] * weight;
      mistGreen[i] += planes[1][i] * weight;
      mistBlue[i] += planes[2][i] * weight;
    }
  });

  // Re-saturate with the hue held (the two lower channels are pushed away
  // from the brightest one), apply the gain, and write back as sRGB.
  const out = ctx.createImageData(width, height);
  const outData = out.data;
  for (let i = 0; i < count; i++) {
    const r = mistRed[i];
    const g = mistGreen[i];
    const b = mistBlue[i];
    const max = Math.max(r, g, b);
    const offset = i * 4;
    if (max <= 0) {
      outData[offset + 3] = 255;
      continue;
    }
    const boost = profile.saturationBoost;
    const gain = profile.gain;
    outData[offset] = linearToSrgbByte(Math.max(0, max - (max - r) * boost) * gain);
    outData[offset + 1] = linearToSrgbByte(Math.max(0, max - (max - g) * boost) * gain);
    outData[offset + 2] = linearToSrgbByte(Math.max(0, max - (max - b) * boost) * gain);
    outData[offset + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return ctx.canvas;
}

/**
 * Screens a mist layer over the given region of a canvas at `amount`.
 *
 * Screen with the amount as alpha adds `amount * mist * (1 - dst)`: linear in
 * the slider, never clipping, and vanishing over pixels that are already
 * white. The layer is the image's working-size copy, so the region is mapped
 * from image pixels onto it. The context's alpha, composite operation, and
 * smoothing are restored before returning.
 *
 * @param ctx Target canvas context.
 * @param layer Mist layer from {@link buildMistLayer}.
 * @param amount Mist amount in [0, 1]; nothing is drawn at or below 0.
 * @param region The image region to draw and where it lands on the canvas.
 */
export function drawMistLayer(
  ctx: CanvasRenderingContext2D,
  layer: HTMLCanvasElement,
  amount: number,
  region: MistDrawRegion,
): void {
  const alpha = Math.min(1, amount);
  if (alpha <= 0 || region.imageWidth <= 0 || region.imageHeight <= 0) {
    return;
  }
  const scaleX = layer.width / region.imageWidth;
  const scaleY = layer.height / region.imageHeight;
  ctx.save();
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      layer,
      region.sourceX * scaleX,
      region.sourceY * scaleY,
      region.sourceWidth * scaleX,
      region.sourceHeight * scaleY,
      0,
      0,
      region.targetWidth,
      region.targetHeight,
    );
  } finally {
    ctx.restore();
  }
}

/**
 * Cache key for a mist layer: the profile alone, since a layer is rebuilt
 * for every new image regardless. Lets a caller notice a profile change
 * without comparing objects field by field.
 * @param profile The profile the layer was built with.
 */
export function mistLayerCacheKey(profile: MistProfile): string {
  return JSON.stringify(profile);
}
