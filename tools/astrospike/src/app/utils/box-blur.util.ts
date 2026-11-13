/**
 * Blurs a row-major single-channel plane with a separable box filter of the
 * given radius, run `passes` times. Three passes approximate a Gaussian of
 * comparable width. Edges replicate their border value, so a bright region
 * against the frame edge is not darkened by the blur.
 *
 * Runs in O(width * height * passes) using running sums, independent of the
 * radius. Returns a new plane; the input is left untouched. A radius of 0
 * (or a degenerate plane) returns a copy.
 *
 * @param plane Row-major values, length = width * height.
 * @param width Plane width in pixels.
 * @param height Plane height in pixels.
 * @param radius Box half-width in pixels; the window spans 2 * radius + 1.
 * @param passes Number of box passes to run in each direction.
 * @returns The blurred plane.
 */
export function boxBlurPlane(
  plane: Float32Array,
  width: number,
  height: number,
  radius: number,
  passes: number,
): Float32Array {
  const r = Math.max(0, Math.floor(radius));
  const current = Float32Array.from(plane);
  if (r === 0 || width <= 0 || height <= 0 || passes <= 0) {
    return current;
  }
  const scratch = new Float32Array(plane.length);
  const window = 2 * r + 1;
  // Each pass blurs rows into the scratch plane and columns back into
  // `current`, so `current` holds the result after every full pass.
  for (let pass = 0; pass < passes; pass++) {
    blurRows(current, scratch, width, height, r, window);
    blurColumns(scratch, current, width, height, r, window);
  }
  return current;
}

/** Horizontal box pass with replicated edges, writing `src` blurred into `dst`. */
function blurRows(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  r: number,
  window: number,
): void {
  const last = width - 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    const first = src[row];
    const end = src[row + last];
    let sum = first * (r + 1);
    for (let i = 1; i <= r; i++) {
      sum += src[row + Math.min(i, last)];
    }
    for (let x = 0; x < width; x++) {
      dst[row + x] = sum / window;
      const incoming = x + r + 1;
      const outgoing = x - r;
      sum += (incoming <= last ? src[row + incoming] : end) - (outgoing >= 0 ? src[row + outgoing] : first);
    }
  }
}

/** Vertical box pass with replicated edges, writing `src` blurred into `dst`. */
function blurColumns(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  r: number,
  window: number,
): void {
  const last = height - 1;
  for (let x = 0; x < width; x++) {
    const first = src[x];
    const end = src[last * width + x];
    let sum = first * (r + 1);
    for (let i = 1; i <= r; i++) {
      sum += src[Math.min(i, last) * width + x];
    }
    for (let y = 0; y < height; y++) {
      dst[y * width + x] = sum / window;
      const incoming = y + r + 1;
      const outgoing = y - r;
      sum +=
        (incoming <= last ? src[incoming * width + x] : end) -
        (outgoing >= 0 ? src[outgoing * width + x] : first);
    }
  }
}
