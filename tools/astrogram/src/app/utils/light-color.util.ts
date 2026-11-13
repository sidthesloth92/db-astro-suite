/** Relative luminance above which a colour reads as "light" (white, pale yellow). */
export const LIGHT_COLOR_LUMINANCE = 0.8;

/**
 * Whether a CSS hex colour (`#fff`, `#ffffff`, `#ffffffcc`) is light enough to
 * vanish on a light (cream, ivory, daylight) card — a white luminance band,
 * say — and so needs an ink outline or ink-coloured text there. Anything that
 * is not a hex colour is treated as dark, leaving it untouched.
 *
 * @param color The band colour.
 */
export function isLightColor(color: string): boolean {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color.trim())?.[1];
  if (!hex) return false;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const s = parseInt(full.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > LIGHT_COLOR_LUMINANCE;
}
