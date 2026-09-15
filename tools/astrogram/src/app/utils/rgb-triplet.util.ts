/**
 * The `r, g, b` channel list of a CSS hex colour (`#b97dff` → `185, 125, 255`),
 * the same shape as the card's `--accent-color-rgb`, so a theme can paint a
 * translucent `rgba(var(--x), a)` of the secondary accent. `color-mix()` would
 * need no script, but it shifts gradient interpolation enough to change a
 * default-coloured export. Accepts `#rgb`, `#rrggbb` and `#rrggbbaa` (alpha
 * ignored); anything else yields an empty string.
 *
 * @param color The hex colour.
 */
export function rgbTriplet(color: string): string {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color.trim())?.[1];
  if (!hex) return '';
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ');
}
