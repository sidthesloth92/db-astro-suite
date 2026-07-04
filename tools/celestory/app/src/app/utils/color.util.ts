/** Colour helpers for canvas/SVG interpolation (brand mark, share cards). */

/** Parse a `#rrggbb` hex string into an [r, g, b] tuple (0–255). */
function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Linearly interpolate between two `#rrggbb` colours, returning a `#rrggbb`
 * string. `t` is clamped to [0, 1].
 */
export function hexLerp(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const ca = toRgb(a);
  const cb = toRgb(b);
  const mix = ca.map((v, i) => Math.round(v + (cb[i] - v) * k));
  return '#' + mix.map((v) => v.toString(16).padStart(2, '0')).join('');
}
