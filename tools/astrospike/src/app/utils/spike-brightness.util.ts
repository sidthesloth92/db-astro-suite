import {
  SPIKE_ALPHA_FLOOR,
  SPIKE_BRIGHTNESS_EXPONENT,
  SPIKE_THICKNESS_MAX_PX,
  SPIKE_THICKNESS_MIN_PX,
} from '../constants/spike-geometry.constants';
import { SpikePreset } from '../models/spike-preset.model';
import { SpikeGeometry } from '../models/spike-render-params.model';

/**
 * Clamps a value into the inclusive [min, max] range.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Blends the brightness scale into a 0-1 factor that never falls below
 * {@link SPIKE_ALPHA_FLOOR}, so the faintest spiked star still renders.
 */
function alphaRamp(scale: number): number {
  return SPIKE_ALPHA_FLOOR + (1 - SPIKE_ALPHA_FLOOR) * scale;
}

/**
 * Relative spike scale (0-1) of a star given its flux and the reference flux of
 * the brightest star: `pow(flux / fluxRef, SPIKE_BRIGHTNESS_EXPONENT)` clamped
 * to [0, 1]. Guards non-positive `fluxRef` (and non-positive flux) by
 * returning 0.
 */
export function starSpikeScale(flux: number, fluxRef: number): number {
  if (fluxRef <= 0 || flux <= 0) {
    return 0;
  }
  return clamp(Math.pow(flux / fluxRef, SPIKE_BRIGHTNESS_EXPONENT), 0, 1);
}

/**
 * Computes the per-star spike geometry (arm length/thickness/alpha and glow
 * radius/alpha) from the star's relative brightness, the active preset, user
 * length/intensity factors, the image's larger dimension, and the
 * image-to-canvas scale. Arm thickness is clamped to a renderable pixel range;
 * alphas are clamped to [0, 1].
 */
export function computeSpikeGeometry(
  flux: number,
  fluxRef: number,
  preset: SpikePreset,
  lengthFactor: number,
  intensityFactor: number,
  imageMaxDimension: number,
  scale: number,
): SpikeGeometry {
  const s = starSpikeScale(flux, fluxRef);
  const ramp = alphaRamp(s);
  // Geometry is resolved in full-resolution image space and only then scaled to
  // the target canvas. Clamping after scaling would let the thickness bounds
  // bite at different points in the downscaled preview than in the
  // full-resolution export, so the exported spikes would not match what the
  // user tuned on screen.
  const imageLengthPx = imageMaxDimension * preset.lengthScale * lengthFactor * s;
  const imageThicknessPx = clamp(
    imageLengthPx * preset.thicknessRatio,
    SPIKE_THICKNESS_MIN_PX,
    SPIKE_THICKNESS_MAX_PX,
  );
  const lengthPx = imageLengthPx * scale;
  const alphaPeak = clamp(preset.intensityScale * intensityFactor * ramp, 0, 1);
  const thicknessPx = imageThicknessPx * scale;
  const glowRadiusPx = thicknessPx * preset.glowRadiusRatio;
  const glowAlpha = clamp(preset.glowIntensity * intensityFactor * ramp, 0, 1);
  return { lengthPx, alphaPeak, thicknessPx, glowRadiusPx, glowAlpha };
}
