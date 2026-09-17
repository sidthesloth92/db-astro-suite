import {
  HALO_MIN_VISIBLE_ALPHA,
  HALO_RADIUS_AMOUNT_EXPONENT,
  SPIKE_ALPHA_FLOOR,
  SPIKE_MAGNITUDE_SLOPE,
  SPIKE_SCALE_FLOOR,
  SPIKE_THICKNESS_MAX_PX,
  SPIKE_THICKNESS_MIN_PX,
} from '../constants/spike-geometry.constants';
import { HaloProfile, SpikePreset } from '../models/spike-preset.model';
import { HaloGeometry, SpikeGeometry } from '../models/spike-render-params.model';

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
 * Deliberately knows nothing about the Glow amount. The spikes and the halo
 * are two independent axes: Length and Brightness shape the spikes, Glow
 * sizes the halo, and neither reaches into the other. Glow used to fade the
 * arms as it rose, which was the only route to a pure halo back when these
 * factors bottomed out at 0.2 — now that they reach 0 the user says when the
 * spikes go, and a slider that quietly dimmed them was just surprising.
 *
 * A zero length or intensity factor yields nothing at all — no arms and no core
 * glow. The thickness floor that keeps thin arms renderable would otherwise
 * leave a glow dot behind on a star the user had explicitly zeroed, and zeroing
 * these two is how a star is left showing only its halo.
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
 * Relative halo scale (0-1) of a star: a floorless power law on relative
 * flux, `(flux / fluxRef) ^ fluxGamma`, clamped to 1 at and above the
 * reference. Guards non-positive flux or reference by returning 0.
 *
 * Deliberately NOT {@link starSpikeScale}: its scale floor and gentle
 * magnitude slope exist so every *spiked* star stays visibly spiked, but
 * applied to halos on a Milky Way frame they hand every one of thousands of
 * faint stars a similar bloom and the field fogs over. A halo is selective by
 * design — the power law sinks faint stars toward zero so only the brightest
 * handful bloom, which is the whole mist-filter look.
 */
export function starHaloScale(flux: number, fluxRef: number, fluxGamma: number): number {
  if (fluxRef <= 0 || flux <= 0) {
    return 0;
  }
  if (flux >= fluxRef) {
    return 1;
  }
  return Math.pow(flux / fluxRef, fluxGamma);
}

/**
 * Computes the two-scale halo every preset draws on a star: the wide skirt's
 * radius and alpha plus the hot core's, all from relative flux, the profile's
 * ratios, the amount and intensity controls, and the image's larger
 * dimension. Radii resolve in image space and scale to the canvas, matching
 * {@link computeSpikeGeometry}'s convention, so preview and export stay
 * proportional; alphas are scale-independent.
 *
 * The two controls split cleanly. `amount` is the Glow control — or the
 * star's own pinned amount when it names one — and it alone sizes the radius,
 * on {@link HALO_RADIUS_AMOUNT_EXPONENT}, while also scaling the alphas so the
 * halo fades in rather than popping. `intensity` is the global Brightness
 * control and scales only the alphas: turning it up burns the halo brighter
 * without growing it. Only the global value belongs here — the per-star
 * brightness multiplier stays an arm-only concept, since the per-star Glow
 * amount already brightens one star's halo on its own.
 *
 * A skirt alpha below {@link HALO_MIN_VISIBLE_ALPHA} zeroes the whole
 * geometry: below that the halo reads as haze, and thousands of hazes summed
 * across a dense field are exactly the fog this profile exists to avoid. The
 * spikes' {@link alphaRamp} floor is skipped for the same reason. Lowering
 * the intensity therefore also thins out how many stars glow at all, which
 * is what dimming a mist filter physically does.
 */
export function computeHaloGeometry(
  flux: number,
  fluxRef: number,
  profile: HaloProfile,
  amount: number,
  intensity: number,
  imageMaxDimension: number,
  scale: number,
): HaloGeometry {
  const clamped = clamp(amount, 0, 1);
  const burn = Math.max(0, intensity);
  if (clamped === 0 || burn === 0) {
    return { haloRadiusPx: 0, haloAlpha: 0, coreRadiusPx: 0, coreAlpha: 0 };
  }
  const h = starHaloScale(flux, fluxRef, profile.fluxGamma);
  const haloAlpha = clamp(profile.haloIntensity * h * clamped * burn, 0, 1);
  if (haloAlpha < HALO_MIN_VISIBLE_ALPHA) {
    return { haloRadiusPx: 0, haloAlpha: 0, coreRadiusPx: 0, coreAlpha: 0 };
  }
  const haloRadiusPx =
    imageMaxDimension *
    profile.haloRadiusScale *
    h *
    Math.pow(clamped, HALO_RADIUS_AMOUNT_EXPONENT) *
    scale;
  const coreRadiusPx = haloRadiusPx * profile.coreRadiusRatio;
  const coreAlpha = clamp(profile.coreIntensity * h * clamped * burn, 0, 1);
  return { haloRadiusPx, haloAlpha, coreRadiusPx, coreAlpha };
}
