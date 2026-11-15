import {
  GIANT_COLOR_RING_FACTOR,
  GIANT_CORE_BRIGHTNESS,
  GIANT_LIFTED_GAP,
  GIANT_MIN_CORE_AREA,
} from '../constants/star-lift.constant';
import { GiantStar, LiftStar } from '../models/star-lift.model';

/**
 * Finds giant stars: burnt-out cores whose glow is far wider than anything the detector lifts
 * (their own glow reads as background, so they are never detected as stars).
 *
 * These stay with the backdrop on purpose. They usually light the nebula around them, and a star
 * torn away from its own glow looks wrong. They are reported so the Sharp style can still give
 * them spikes.
 *
 * @param lum - Brightness per pixel, 0..1
 * @param pixels - The photo, RGBA
 * @param lifted - Stars already lifted; a core that is one of them is not a giant
 */
export function findGiantStars(
  lum: Float32Array,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  lifted: readonly LiftStar[],
): GiantStar[] {
  const seen = new Uint8Array(width * height);
  const giants: GiantStar[] = [];
  const stack: number[] = [];

  for (let start = 0; start < lum.length; start++) {
    if (seen[start] !== 0 || lum[start] < GIANT_CORE_BRIGHTNESS) continue;
    let area = 0;
    let sumX = 0;
    let sumY = 0;
    stack.push(start);
    seen[start] = 1;
    for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
      const x = i % width;
      const y = (i / width) | 0;
      area++;
      sumX += x;
      sumY += y;
      if (x > 0) visit(i - 1);
      if (x < width - 1) visit(i + 1);
      if (y > 0) visit(i - width);
      if (y < height - 1) visit(i + width);
    }
    if (area < GIANT_MIN_CORE_AREA) continue;

    const cx = sumX / area;
    const cy = sumY / area;
    const rCore = Math.sqrt(area / Math.PI);
    const alreadyLifted = lifted.some(
      (star) => Math.hypot(star.x - cx, star.y - cy) < rCore + GIANT_LIFTED_GAP,
    );
    if (alreadyLifted) continue;

    giants.push({ x: cx, y: cy, rCore, color: glowColor(pixels, width, height, cx, cy, rCore) });
  }
  return giants;

  function visit(index: number): void {
    if (seen[index] === 0 && lum[index] >= GIANT_CORE_BRIGHTNESS) {
      seen[index] = 1;
      stack.push(index);
    }
  }
}

/** Mean colour on a ring just outside the core, with the brightest channel scaled to 1. */
function glowColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  rCore: number,
): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  for (let k = 0; k < 24; k++) {
    const angle = (k / 24) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(angle) * rCore * GIANT_COLOR_RING_FACTOR);
    const y = Math.round(cy + Math.sin(angle) * rCore * GIANT_COLOR_RING_FACTOR);
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const p = (y * width + x) * 4;
    r += pixels[p];
    g += pixels[p + 1];
    b += pixels[p + 2];
  }
  const max = Math.max(r, g, b, 1e-6);
  return [r / max, g / max, b / max];
}
