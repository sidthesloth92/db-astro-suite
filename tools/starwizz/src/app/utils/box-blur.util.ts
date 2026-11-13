/**
 * Blurs a single-channel image with three box-blur passes, which is a close and fast stand-in
 * for a Gaussian. Edges are clamped. Returns a new array; the source is left untouched.
 *
 * @param source - Row-major image, one value per pixel
 * @param width - Image width in px
 * @param height - Image height in px
 * @param radius - Box radius in px; 0 or less returns a copy
 */
export function blurImage(
  source: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const r = Math.floor(radius);
  if (r <= 0) {
    return new Float32Array(source);
  }
  let current = source;
  for (let pass = 0; pass < 3; pass++) {
    current = blurVertical(blurHorizontal(current, width, height, r), width, height, r);
  }
  return current;
}

function blurHorizontal(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(w * h);
  const norm = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      sum += src[row + Math.min(w - 1, Math.max(0, i))];
    }
    for (let x = 0; x < w; x++) {
      out[row + x] = sum * norm;
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  return out;
}

function blurVertical(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(w * h);
  const norm = 1 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      sum += src[Math.min(h - 1, Math.max(0, i)) * w + x];
    }
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum * norm;
      sum += src[Math.min(h - 1, y + r + 1) * w + x] - src[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}
