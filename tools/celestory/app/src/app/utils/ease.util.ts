/** Small, dependency-free easing + clamp helpers shared by canvas/SVG animations. */

/** Clamp `x` into the inclusive range `[lo, hi]`. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Cubic ease-out: fast start, gentle settle. */
export function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

/** Cubic ease-in-out: gentle at both ends. */
export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
