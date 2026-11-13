import {
  KNOT_BACKGROUND_SATURATION,
  KNOT_EXCESS_SATURATION,
  KNOT_HUE_SIMILARITY,
  KNOT_MIN_BACKGROUND,
  KNOT_MIN_EXCESS,
  KNOT_RING_SAMPLES,
} from '../constants/star-lift.constant';
import { LiftStar } from '../models/star-lift.model';

/**
 * True when a detection is a bright knot or ridge of nebula rather than a star.
 *
 * A star sitting on nebula adds near-white light (or its own colour) to what is around it. A
 * knot adds more of the nebula's own colour: strongly saturated and the same hue as its
 * surroundings. Lifting a knot would redraw a piece of the nebula as a coloured "star".
 *
 * @param star - The detection to classify
 * @param pixels - The photo, RGBA
 */
export function isNebulaKnot(
  star: LiftStar,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): boolean {
  const ring: number[][] = [[], [], []];
  for (let k = 0; k < KNOT_RING_SAMPLES; k++) {
    const angle = (k / KNOT_RING_SAMPLES) * Math.PI * 2;
    const x = Math.round(star.x + Math.cos(angle) * star.rHalo);
    const y = Math.round(star.y + Math.sin(angle) * star.rHalo);
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const p = (y * width + x) * 4;
    ring[0].push(pixels[p] / 255);
    ring[1].push(pixels[p + 1] / 255);
    ring[2].push(pixels[p + 2] / 255);
  }
  if (ring[0].length < 8) return false;
  const surroundings = ring.map((channel) => channel.sort((a, b) => a - b)[channel.length >> 1]);

  const coreRadius = Math.max(1, star.rHalf);
  const core = [0, 0, 0];
  let count = 0;
  for (let dy = -coreRadius; dy <= coreRadius; dy++) {
    for (let dx = -coreRadius; dx <= coreRadius; dx++) {
      const x = star.x + dx;
      const y = star.y + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if (dx * dx + dy * dy > coreRadius * coreRadius) continue;
      const p = (y * width + x) * 4;
      core[0] += pixels[p] / 255;
      core[1] += pixels[p + 1] / 255;
      core[2] += pixels[p + 2] / 255;
      count++;
    }
  }
  if (count === 0) return false;

  const excess = core.map((sum, k) => Math.max(0, sum / count - surroundings[k]));
  const excessMax = Math.max(excess[0], excess[1], excess[2]);
  const surroundingsMax = Math.max(surroundings[0], surroundings[1], surroundings[2]);
  if (excessMax < KNOT_MIN_EXCESS || surroundingsMax < KNOT_MIN_BACKGROUND) return false;

  const excessSaturation = 1 - Math.min(excess[0], excess[1], excess[2]) / excessMax;
  const surroundingsSaturation =
    1 - Math.min(surroundings[0], surroundings[1], surroundings[2]) / surroundingsMax;
  const dot =
    excess[0] * surroundings[0] + excess[1] * surroundings[1] + excess[2] * surroundings[2];
  const hue =
    dot /
    (Math.hypot(excess[0], excess[1], excess[2]) *
      Math.hypot(surroundings[0], surroundings[1], surroundings[2]) +
      1e-9);

  return (
    excessSaturation > KNOT_EXCESS_SATURATION &&
    surroundingsSaturation > KNOT_BACKGROUND_SATURATION &&
    hue > KNOT_HUE_SIMILARITY
  );
}
