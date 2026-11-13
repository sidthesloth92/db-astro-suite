/** One star (or blob) to plant in a synthetic photo. */
export interface PlantedStar {
  /** Centre column in px. */
  x: number;
  /** Centre row in px. */
  y: number;
  /** Peak brightness added on top of the background, 0..1. */
  amp: number;
  /** Gaussian sigma in px. */
  sigma: number;
  /** Colour of the added light, brightest channel = 1. Defaults to white. */
  color?: [number, number, number];
}

/**
 * Renders a small RGBA test photo: a flat background colour plus Gaussian blobs. Spec-only;
 * it lets the star-lifting specs check results against a known answer.
 *
 * @param background - Background colour, channels 0..1
 */
export function makePhoto(
  width: number,
  height: number,
  background: [number, number, number],
  stars: readonly PlantedStar[] = [],
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = background[0];
      let g = background[1];
      let b = background[2];
      for (const star of stars) {
        const d2 = (x - star.x) * (x - star.x) + (y - star.y) * (y - star.y);
        if (d2 > 36 * star.sigma * star.sigma) continue;
        const light = star.amp * Math.exp(-d2 / (2 * star.sigma * star.sigma));
        const color = star.color ?? [1, 1, 1];
        r += light * color[0];
        g += light * color[1];
        b += light * color[2];
      }
      const p = (y * width + x) * 4;
      pixels[p] = Math.round(Math.min(1, r) * 255);
      pixels[p + 1] = Math.round(Math.min(1, g) * 255);
      pixels[p + 2] = Math.round(Math.min(1, b) * 255);
      pixels[p + 3] = 255;
    }
  }
  return pixels;
}

/** Reads one pixel of an RGBA image as [r, g, b] in 0..255. */
export function pixelAt(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number] {
  const p = (y * width + x) * 4;
  return [pixels[p], pixels[p + 1], pixels[p + 2]];
}
