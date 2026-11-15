import {
  MEASURE_BRIGHT_PEAK,
  MEASURE_MIN_HWHM,
  MEASURE_PROFILE_FLUX_FACTOR,
  MEASURE_RIM_SAMPLES,
} from '../constants/star-lift.constant';
import { LiftStar, StarMeasurement } from '../models/star-lift.model';

/**
 * Measures a star so the Sharp style can redraw it: peak brightness, width and colour, all
 * relative to what surrounds it in the photo.
 *
 * The surroundings are the median on a rim just outside the star, so a bright neighbour's glow
 * or the nebula underneath is not counted as part of the star. The width is derived from the
 * star's total light and peak, which keeps the redrawn star as bright as the original. (Shape
 * based widths are useless here: leftover noise far from a faint star inflates them.)
 *
 * @param star - The detection to measure
 * @param pixels - The photo, RGBA
 * @returns The measurement, or null when no light stands above the surroundings
 */
export function measureStar(
  star: LiftStar,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): StarMeasurement | null {
  const windowRadius = Math.max(2, Math.min(star.rHalo, 2 * star.rHalf + 2));

  const rim: number[][] = [[], [], []];
  for (let k = 0; k < MEASURE_RIM_SAMPLES; k++) {
    const angle = (k / MEASURE_RIM_SAMPLES) * Math.PI * 2;
    const x = Math.round(star.x + Math.cos(angle) * (windowRadius + 1));
    const y = Math.round(star.y + Math.sin(angle) * (windowRadius + 1));
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const p = (y * width + x) * 4;
    rim[0].push(pixels[p]);
    rim[1].push(pixels[p + 1]);
    rim[2].push(pixels[p + 2]);
  }
  const pedestal = rim.map((channel) =>
    channel.length > 0 ? channel.sort((a, b) => a - b)[channel.length >> 1] : 0,
  );

  // Faint stars gather light tightly; bright ones over their whole disc so their glow counts.
  const gatherRadius = star.peak > MEASURE_BRIGHT_PEAK ? windowRadius : Math.max(2, star.rHalf + 1);
  let flux = 0;
  let amp = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  for (let dy = -gatherRadius; dy <= gatherRadius; dy++) {
    for (let dx = -gatherRadius; dx <= gatherRadius; dx++) {
      const x = star.x + dx;
      const y = star.y + dy;
      const r2 = dx * dx + dy * dy;
      if (x < 0 || y < 0 || x >= width || y >= height || r2 > gatherRadius * gatherRadius) continue;
      const p = (y * width + x) * 4;
      const r = Math.max(0, pixels[p] - pedestal[0]) / 255;
      const g = Math.max(0, pixels[p + 1] - pedestal[1]) / 255;
      const b = Math.max(0, pixels[p + 2] - pedestal[2]) / 255;
      const brightness = Math.max(r, g, b);
      flux += brightness;
      red += r;
      green += g;
      blue += b;
      if (r2 <= 2 && brightness > amp) amp = brightness;
    }
  }
  if (flux <= 0 || amp <= 0) return null;

  const hwhm = Math.min(
    star.rHalf + 0.5,
    Math.max(MEASURE_MIN_HWHM, Math.sqrt(flux / (MEASURE_PROFILE_FLUX_FACTOR * amp))),
  );
  const max = Math.max(red, green, blue, 1e-6);
  return { amp, hwhm, color: [red / max, green / max, blue / max] };
}
