/**
 * Lookup from an 8-bit sRGB channel to linear light in [0, 1], built once.
 * Blurring and thresholding happen in linear light: the same operations in
 * gamma space bias toward grey and read as dull haze.
 */
export const SRGB_TO_LINEAR: Float32Array = (() => {
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    table[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return table;
})();

/**
 * Converts a linear-light value to an 8-bit sRGB channel, clamping to
 * [0, 255] and rounding.
 * @param linear Linear-light value; anything outside [0, 1] is clamped.
 */
export function linearToSrgbByte(linear: number): number {
  const c = Math.min(1, Math.max(0, linear));
  const srgb = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(srgb * 255);
}
