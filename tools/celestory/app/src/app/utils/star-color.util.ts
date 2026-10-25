/**
 * Star colour from B−V: Ballesteros' temperature formula, then a blackbody
 * integrated against the CIE 1931 colour-matching functions (Wyman et al.
 * 2013 multi-lobe fit) into linear sRGB, normalised to unit luminance so the
 * V magnitude alone sets brightness.
 */

/** Effective temperature (K) from B−V (Ballesteros 2012). */
export function bvToTemperature(bv: number): number {
  const b = Math.max(-0.4, Math.min(2.5, bv));
  return 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62));
}

function gaussianPiece(x: number, mu: number, s1: number, s2: number): number {
  const t = (x - mu) / (x < mu ? s1 : s2);
  return Math.exp(-0.5 * t * t);
}

/** CIE 1931 2° colour-matching functions at wavelength λ (nm), Wyman et al. fit. */
export function cieXyzBar(lambda: number): [number, number, number] {
  const x =
    1.056 * gaussianPiece(lambda, 599.8, 37.9, 31.0) +
    0.362 * gaussianPiece(lambda, 442.0, 16.0, 26.7) -
    0.065 * gaussianPiece(lambda, 501.1, 20.4, 26.2);
  const y = 0.821 * gaussianPiece(lambda, 568.8, 46.9, 40.5) + 0.286 * gaussianPiece(lambda, 530.9, 16.3, 31.1);
  const z = 1.217 * gaussianPiece(lambda, 437.0, 11.8, 36.0) + 0.681 * gaussianPiece(lambda, 459.0, 26.0, 13.8);
  return [x, y, z];
}

/** Planck spectral radiance (arbitrary scale) at λ (nm) for temperature T (K). */
function planck(lambdaNm: number, t: number): number {
  const l = lambdaNm * 1e-9;
  const c2 = 1.438776877e-2;
  return 1 / (Math.pow(l, 5) * (Math.exp(c2 / (l * t)) - 1));
}

/** Linear sRGB (luminance-normalised, non-negative) for a blackbody at T (K). */
export function blackbodyLinearRgb(t: number): [number, number, number] {
  let X = 0;
  let Y = 0;
  let Z = 0;
  for (let l = 380; l <= 780; l += 5) {
    const p = planck(l, t);
    const [xb, yb, zb] = cieXyzBar(l);
    X += p * xb;
    Y += p * yb;
    Z += p * zb;
  }
  X /= Y;
  Z /= Y;
  Y = 1;
  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  let g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  let b = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);
  // Renormalise luminance after clipping negatives.
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [r / lum, g / lum, b / lum];
}

/** Build a `width`-entry RGB LUT covering B−V from −0.5 to 2.5 (row-major RGB floats). */
export function buildStarColorLut(width: number): Float32Array {
  const out = new Float32Array(width * 3);
  for (let i = 0; i < width; i++) {
    const bv = -0.5 + (3.0 * i) / (width - 1);
    const [r, g, b] = blackbodyLinearRgb(bvToTemperature(bv));
    // Desaturate slightly toward white: real stars never look as saturated as a pure blackbody.
    const k = 0.78;
    out[i * 3] = 1 + (r - 1) * k;
    out[i * 3 + 1] = 1 + (g - 1) * k;
    out[i * 3 + 2] = 1 + (b - 1) * k;
  }
  return out;
}
