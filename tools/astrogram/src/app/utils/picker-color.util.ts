/**
 * Colours derived from the Layout panel's accent / secondary pickers, for the
 * places a theme cannot use the picker's CSS variable directly.
 */

/** Parses `#rgb` / `#rrggbb` (alpha ignored) into channels, or `null`. */
function parseHex(hex: string): [number, number, number] | null {
  const digits = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim())?.[1];
  if (!digits) return null;
  const full = digits.length === 3 ? [...digits].map((c) => c + c).join('') : digits.slice(0, 6);
  const channel = (i: number): number => parseInt(full.slice(i, i + 2), 16);
  return [channel(0), channel(2), channel(4)];
}

/**
 * The `"r, g, b"` triplet of a hex colour, for `rgba(var(--x-rgb), a)`. A
 * `color-mix()` translucency would switch a gradient it sits in to Oklab
 * interpolation and shift every pixel of it. Anything that is not a hex colour
 * gives black, so the declaration using it stays valid.
 *
 * @param hex The picker colour.
 */
export function rgbTriplet(hex: string): string {
  const rgb = parseHex(hex) ?? [0, 0, 0];
  return rgb.join(', ');
}

/**
 * Re-tones a picker colour the way a design tone relates to the design's own
 * base colour, channel by channel: a lighter tone moves each channel the same
 * share of the way to white, a darker one scales it by the same factor. The
 * design base itself therefore yields the design tone exactly, and any other
 * colour gets the same highlight or shade. Invalid input returns the tone.
 *
 * @param hex The picker colour.
 * @param designBase The design's colour for the picker role, e.g. `#8A5BC2`.
 * @param designTone A lighter or darker design colour tied to it, e.g. `#46256E`.
 */
export function matchTone(hex: string, designBase: string, designTone: string): string {
  const color = parseHex(hex);
  const base = parseHex(designBase);
  const tone = parseHex(designTone);
  if (!color || !base || !tone) return designTone;
  const channels = color.map((c, i) => {
    const [b, t] = [base[i], tone[i]];
    if (t >= b) return b === 255 ? 255 : c + ((255 - c) * (t - b)) / (255 - b);
    return (c * t) / b;
  });
  return `#${channels.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}
