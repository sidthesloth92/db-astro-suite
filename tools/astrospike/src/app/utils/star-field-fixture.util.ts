import { SyntheticBackground, SyntheticStar } from '../models/synthetic-field.model';

/**
 * Deterministic 32-bit PRNG (mulberry32). Returns a generator producing
 * uniformly distributed floats in [0, 1); the same seed always yields the
 * same sequence.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws one standard-normal sample via the Box–Muller transform, consuming
 * two uniforms from the supplied generator.
 */
function nextGaussian(rand: () => number): number {
  const u1 = Math.max(rand(), Number.EPSILON);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Renders a deterministic synthetic star field as an RGBA pixel buffer for
 * use in specs. Each pixel is background base + linear gradient + the sum of
 * Gaussian star profiles + Gaussian noise scaled by `noiseSigma`. Background
 * and noise are gray; a star's optional color tints its contribution by
 * scaling each channel by color/255. Values clamp to 0–255, alpha is 255.
 */
export function renderSyntheticField(
  width: number,
  height: number,
  stars: readonly SyntheticStar[],
  background: SyntheticBackground,
  noiseSigma: number,
  seed: number,
): Uint8ClampedArray {
  const rand = mulberry32(seed);
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gray =
        background.base +
        background.gradientX * x +
        background.gradientY * y +
        nextGaussian(rand) * noiseSigma;
      let r = gray;
      let g = gray;
      let b = gray;
      for (const star of stars) {
        const dx = x - star.x;
        const dy = y - star.y;
        const contribution =
          star.amplitude * Math.exp(-(dx * dx + dy * dy) / (2 * star.sigma * star.sigma));
        if (star.color) {
          r += contribution * (star.color.r / 255);
          g += contribution * (star.color.g / 255);
          b += contribution * (star.color.b / 255);
        } else {
          r += contribution;
          g += contribution;
          b += contribution;
        }
      }
      const i = (y * width + x) * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }
  return out;
}
