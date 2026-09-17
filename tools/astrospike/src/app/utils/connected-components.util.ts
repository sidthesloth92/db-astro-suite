import { SourceComponent } from '../models/detection.types';

/**
 * Labels connected components of set pixels in a binary detection mask using
 * an iterative flood fill (explicit `Int32Array` stack — no recursion) with
 * 8-connectivity, so diagonally touching pixels merge into one component.
 *
 * Components whose pixel count exceeds `maxArea` are fully consumed (every
 * pixel is labeled as visited so it cannot seed another component) but are
 * NOT included in the returned list.
 *
 * @param mask Binary mask, length = width * height; non-zero means "source".
 * @param width Mask width in pixels.
 * @param height Mask height in pixels.
 * @param maxArea Maximum pixel count for a component to be returned.
 * @returns Components in scan order, each with its flat pixel indices
 *   (`y * width + x`) and pixel count.
 */
export function labelComponents(
  mask: Uint8Array,
  width: number,
  height: number,
  maxArea: number,
): SourceComponent[] {
  const size = width * height;
  const labels = new Int32Array(size);
  // Each pixel is pushed at most once (it is labeled when pushed), so a
  // stack of `size` entries can never overflow.
  const stack = new Int32Array(size);
  const components: SourceComponent[] = [];
  let nextLabel = 0;

  for (let start = 0; start < size; start++) {
    if (mask[start] === 0 || labels[start] !== 0) {
      continue;
    }

    nextLabel += 1;
    let stackTop = 0;
    stack[stackTop] = start;
    stackTop += 1;
    labels[start] = nextLabel;

    let pixels = new Int32Array(16);
    let count = 0;

    while (stackTop > 0) {
      stackTop -= 1;
      const idx = stack[stackTop];

      // Store at most maxArea pixels: once the component is known to be
      // oversized it will be discarded, but the flood fill keeps running so
      // the whole component is consumed.
      if (count < maxArea) {
        if (count === pixels.length) {
          const grown = new Int32Array(Math.min(size, pixels.length * 2));
          grown.set(pixels);
          pixels = grown;
        }
        pixels[count] = idx;
      }
      count += 1;

      const x = idx % width;
      const y = (idx - x) / width;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) {
          continue;
        }
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const nx = x + dx;
          if (nx < 0 || nx >= width) {
            continue;
          }
          const nIdx = ny * width + nx;
          if (mask[nIdx] !== 0 && labels[nIdx] === 0) {
            labels[nIdx] = nextLabel;
            stack[stackTop] = nIdx;
            stackTop += 1;
          }
        }
      }
    }

    if (count <= maxArea) {
      components.push({ pixels: pixels.slice(0, count), count });
    }
  }

  return components;
}
