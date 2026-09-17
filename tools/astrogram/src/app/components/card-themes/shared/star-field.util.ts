/** A single generated star: centre, radius, and final opacity. */
export interface StarPoint {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly opacity: number;
}

/**
 * Deterministically generates a star field matching the design source's
 * `StarField` primitive: a cheap LCG-style hash spreads points across the
 * `width × height` box, with three radius tiers and a stepped opacity ramp.
 * Same inputs → same layout, so the export is byte-stable.
 */
export function generateStarfield(
  width: number,
  height: number,
  density: number,
  opacity: number,
  seed: number,
): StarPoint[] {
  const stars: StarPoint[] = [];
  for (let i = 0; i < density; i++) {
    const n = (i + seed) * 9301 + 49297;
    const cx = n % width;
    const cy = (n * 7) % height;
    const r = i % 13 === 0 ? 1.6 : i % 5 === 0 ? 1.0 : 0.5;
    const o = 0.25 + ((i * 13) % 7) * 0.1;
    stars.push({ cx, cy, r, opacity: o * opacity });
  }
  return stars;
}
