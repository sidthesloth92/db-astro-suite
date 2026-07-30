import {
  DIFFUSION_BLOOM_INTENSITY,
  DIFFUSION_RADIUS_EXPONENT,
  SPIKE_ALPHA_FLOOR,
  SPIKE_MAGNITUDE_SLOPE,
  SPIKE_SCALE_FLOOR,
  SPIKE_THICKNESS_MAX_PX,
  SPIKE_THICKNESS_MIN_PX,
} from '../constants/spike-geometry.constants';
import { SpikePreset } from '../models/spike-preset.model';
import { GlowGeometry, SpikeGeometry } from '../models/spike-render-params.model';

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
 * Relative spike scale (0-1) of a star given its flux and the reference flux:
 * linear in stellar magnitude, losing `SPIKE_MAGNITUDE_SLOPE` per factor-of-two
 * of flux below the reference and clamped to `[SPIKE_SCALE_FLOOR, 1]`. A power
 * law on raw flux collapses here: real frames span thousands-to-one in
 * integrated flux, which rendered everything beyond the brightest handful at
 * sub-pixel size. Guards non-positive `fluxRef` (and non-positive flux) by
 * returning 0.
 */
export function starSpikeScale(flux: number, fluxRef: number): number {
  if (fluxRef <= 0 || flux <= 0) {
    return 0;
  }
  if (flux >= fluxRef) {
    return 1;
  }
  return clamp(1 - SPIKE_MAGNITUDE_SLOPE * Math.log2(fluxRef / flux), SPIKE_SCALE_FLOOR, 1);
}

/**
 * Computes the per-star spike geometry (arm length/thickness/alpha and glow
 * radius/alpha) from the star's relative brightness, the active preset, user
 * length/intensity factors, the image's larger dimension, and the
 * image-to-canvas scale. Arm thickness is clamped to a renderable pixel range;
 * alphas are clamped to [0, 1].
 *
 * Deliberately knows nothing about diffusion. The spikes and the bloom are two
 * independent axes: Length and Brightness shape the spikes, Diffusion shapes
 * the bloom, and neither reaches into the other. Diffusion used to fade the
 * arms as it rose, which was the only route to a pure bloom back when these
 * factors bottomed out at 0.2 — now that they reach 0 the user says when the
 * spikes go, and a slider that quietly dimmed them was just surprising.
 *
 * A zero length or intensity factor yields nothing at all — no arms and no core
 * glow. The thickness floor that keeps thin arms renderable would otherwise
 * leave a glow dot behind on a star the user had explicitly zeroed, and zeroing
 * these two is how a star is left showing only its bloom.
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
  if (lengthFactor <= 0 || intensityFactor <= 0) {
    return { lengthPx: 0, alphaPeak: 0, thicknessPx: 0, glowRadiusPx: 0, glowAlpha: 0 };
  }
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

/**
 * Computes the diffusion bloom for a star: a radius sized from the image's
 * larger dimension, the preset's bloom scale, the star's relative brightness,
 * and the diffusion amount, plus its alpha. Both fall to zero at zero
 * diffusion, which is what leaves a preset rendering exactly as it did before
 * diffusion existed.
 *
 * Deliberately independent of the Length and Brightness controls, which shape
 * the spikes alone. Sizing the bloom through them made it impossible to zero a
 * star's spike and keep its bloom — the one arrangement the two controls exist
 * side by side to allow. Star brightness still orders the blooms, so a bright
 * star blooms wider than a faint one.
 *
 * The radius is deliberately NOT the `glowRadiusPx` of
 * {@link computeSpikeGeometry}. That one hangs off arm thickness, which hangs
 * off arm length, so a fully diffused star would bloom at the clamped minimum
 * thickness — the same few pixels for the brightest star in the frame as for
 * the faintest, and the brightness ordering that makes a diffusion filter
 * readable would be gone.
 */
export function computeBloomGeometry(
  flux: number,
  fluxRef: number,
  preset: SpikePreset,
  diffusion: number,
  imageMaxDimension: number,
  scale: number,
): GlowGeometry {
  const amount = clamp(diffusion, 0, 1);
  if (amount === 0) {
    return { radiusPx: 0, alpha: 0 };
  }
  const s = starSpikeScale(flux, fluxRef);
  const ramp = alphaRamp(s);
  const radiusPx =
    imageMaxDimension *
    preset.glowRadiusScale *
    s *
    Math.pow(amount, DIFFUSION_RADIUS_EXPONENT) *
    scale;
  const alpha = clamp(DIFFUSION_BLOOM_INTENSITY * ramp * amount, 0, 1);
  return { radiusPx, alpha };
}
