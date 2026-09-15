/**
 * The `r, g, b` channels of a CSS hex colour (`#rgb` or `#rrggbb`, alpha
 * ignored), for use as `rgba(var(--x), a)` in a theme stylesheet. A translucent
 * colour built this way renders exactly like the literal `rgba()` it replaces;
 * `color-mix()` with `transparent` drifts by a level in exports. Anything that
 * is not a hex colour gives black, so the `rgba()` using it stays valid.
 *
 * @param color The hex colour, e.g. a Layout panel accent.
 */
export function hexToRgbChannels(color: string): string {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color.trim())?.[1];
  if (!hex) return '0, 0, 0';
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ');
}
