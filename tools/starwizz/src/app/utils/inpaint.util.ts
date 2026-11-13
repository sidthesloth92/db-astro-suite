import { PyramidLevel } from '../models/star-lift.model';

/**
 * Fills the holes left by lifted stars using push-pull interpolation: the image is repeatedly
 * halved, averaging only known pixels, until every hole has a value; the values are then pulled
 * back down, each level filling its holes from the level above. Small holes get nearby colour,
 * large holes a smooth blend, and known pixels are never changed.
 *
 * @param pixels - The photo, RGBA
 * @param owner - Per-pixel owner map; any value other than -1 marks a hole
 * @returns A new RGBA image with every hole filled
 */
export function inpaintHoles(
  pixels: Uint8ClampedArray,
  owner: Int32Array,
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  if (width < 2 || height < 2) {
    return out;
  }

  // Push: level 1 is built straight from the 8-bit photo, the rest from the level below.
  const levels: PyramidLevel[] = [firstLevel(pixels, owner, width, height)];
  while (levels[levels.length - 1].width > 2 && levels[levels.length - 1].height > 2) {
    levels.push(halve(levels[levels.length - 1]));
  }

  // Pull: fill each level's holes from the (already complete) level above it.
  for (let l = levels.length - 2; l >= 0; l--) {
    const level = levels[l];
    const above = levels[l + 1];
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const i = y * level.width + x;
        const known = level.valid[i];
        if (known >= 1) continue;
        for (let c = 0; c < 3; c++) {
          const filled = sampleBilinear(above, x, y, c);
          level.color[i * 3 + c] = known * level.color[i * 3 + c] + (1 - known) * filled;
        }
        level.valid[i] = 1;
      }
    }
  }

  const base = levels[0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (owner[i] === -1) continue;
      out[i * 4] = sampleBilinear(base, x, y, 0);
      out[i * 4 + 1] = sampleBilinear(base, x, y, 1);
      out[i * 4 + 2] = sampleBilinear(base, x, y, 2);
    }
  }
  return out;
}

/** Half-size level averaged from the known pixels of the 8-bit photo. */
function firstLevel(
  pixels: Uint8ClampedArray,
  owner: Int32Array,
  width: number,
  height: number,
): PyramidLevel {
  const w = Math.ceil(width / 2);
  const h = Math.ceil(height / 2);
  const color = new Float32Array(w * h * 3);
  const valid = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let count = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let dy = 0; dy < 2; dy++) {
        const sy = Math.min(height - 1, y * 2 + dy);
        for (let dx = 0; dx < 2; dx++) {
          const sx = Math.min(width - 1, x * 2 + dx);
          const si = sy * width + sx;
          if (owner[si] !== -1) continue;
          count++;
          r += pixels[si * 4];
          g += pixels[si * 4 + 1];
          b += pixels[si * 4 + 2];
        }
      }
      const i = y * w + x;
      if (count > 0) {
        color[i * 3] = r / count;
        color[i * 3 + 1] = g / count;
        color[i * 3 + 2] = b / count;
        valid[i] = 1;
      }
    }
  }
  return { color, valid, width: w, height: h };
}

/** Half-size level averaged from the known pixels of the level below. */
function halve(level: PyramidLevel): PyramidLevel {
  const w = Math.ceil(level.width / 2);
  const h = Math.ceil(level.height / 2);
  const color = new Float32Array(w * h * 3);
  const valid = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let weight = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let dy = 0; dy < 2; dy++) {
        const sy = Math.min(level.height - 1, y * 2 + dy);
        for (let dx = 0; dx < 2; dx++) {
          const sx = Math.min(level.width - 1, x * 2 + dx);
          const si = sy * level.width + sx;
          const v = level.valid[si];
          weight += v;
          r += v * level.color[si * 3];
          g += v * level.color[si * 3 + 1];
          b += v * level.color[si * 3 + 2];
        }
      }
      const i = y * w + x;
      if (weight > 0) {
        color[i * 3] = r / weight;
        color[i * 3 + 1] = g / weight;
        color[i * 3 + 2] = b / weight;
        valid[i] = 1;
      }
    }
  }
  return { color, valid, width: w, height: h };
}

/** Bilinear sample of a half-size level at the position of a pixel (x, y) of the level below. */
function sampleBilinear(level: PyramidLevel, x: number, y: number, channel: number): number {
  const fx = Math.min(level.width - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
  const fy = Math.min(level.height - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(level.width - 1, x0 + 1);
  const y1 = Math.min(level.height - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const c = level.color;
  const w = level.width;
  const top = c[(y0 * w + x0) * 3 + channel] * (1 - tx) + c[(y0 * w + x1) * 3 + channel] * tx;
  const bottom = c[(y1 * w + x0) * 3 + channel] * (1 - tx) + c[(y1 * w + x1) * 3 + channel] * tx;
  return top * (1 - ty) + bottom * ty;
}
