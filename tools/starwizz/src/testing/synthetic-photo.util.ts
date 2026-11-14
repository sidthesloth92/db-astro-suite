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

/** One straight band of nebula to plant in a synthetic photo. */
export interface PlantedFilament {
  /** Column of a point on the band's centre line, px. */
  x: number;
  /** Row of that point, px. */
  y: number;
  /** Direction the band runs in, degrees from the x axis. */
  angle: number;
  /** Peak brightness added on the centre line, 0..1. */
  amp: number;
  /** Gaussian sigma across the band, px. */
  sigma: number;
  /** Colour of the added light, brightest channel = 1. Defaults to white. */
  color?: [number, number, number];
}

/**
 * Returns a copy of a test photo with a straight band of nebula added across the whole frame.
 * Spec-only; it lets the star-lifting specs put a star on a filament.
 */
export function withFilament(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  filament: PlantedFilament,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  const radians = (filament.angle * Math.PI) / 180;
  const nx = -Math.sin(radians);
  const ny = Math.cos(radians);
  const color = filament.color ?? [1, 1, 1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const across = (x - filament.x) * nx + (y - filament.y) * ny;
      const light =
        filament.amp * Math.exp(-(across * across) / (2 * filament.sigma * filament.sigma));
      const p = (y * width + x) * 4;
      out[p] = Math.min(255, out[p] + Math.round(light * color[0] * 255));
      out[p + 1] = Math.min(255, out[p + 1] + Math.round(light * color[1] * 255));
      out[p + 2] = Math.min(255, out[p + 2] + Math.round(light * color[2] * 255));
    }
  }
  return out;
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
