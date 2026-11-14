import { LIFT_RING_HIGH_QUANTILE, LIFT_RING_QUANTILE } from '../constants/star-lift.constant';

/**
 * Reads the brightness of rings around one point of an image, for measuring a star.
 *
 * Each ring is summarised by two levels instead of an average: the level of its darker part and
 * of its brighter part. A star lights its whole ring evenly, so both follow the star. Nebula
 * crossing the ring lights only part of it, which lifts the brighter level and leaves the
 * darker one alone. That difference is what tells starlight from a filament running through.
 */
export class RingProfile {
  private readonly samples: Float32Array;
  private readonly lows: Float32Array;
  private readonly highs: Float32Array;
  private readonly measured: Uint8Array;
  private x = 0;
  private y = 0;

  /**
   * @param lum - Brightness per pixel, 0..1
   * @param width - Image width in px
   * @param height - Image height in px
   * @param maxRadius - Largest ring radius (px) that will be asked for
   */
  constructor(
    private readonly lum: Float32Array,
    private readonly width: number,
    private readonly height: number,
    private readonly maxRadius: number,
  ) {
    this.samples = new Float32Array(Math.max(8, Math.round(2 * Math.PI * maxRadius)));
    this.lows = new Float32Array(maxRadius + 1);
    this.highs = new Float32Array(maxRadius + 1);
    this.measured = new Uint8Array(maxRadius + 1);
  }

  /** Starts reading rings around a new point. */
  centreOn(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.measured.fill(0);
  }

  /** Level of the darker part of the ring at a radius, or NaN when the ring is off the image. */
  low(radius: number): number {
    this.measure(radius);
    return this.lows[radius];
  }

  /** Level of the brighter part of the ring at a radius, or NaN when the ring is off the image. */
  high(radius: number): number {
    this.measure(radius);
    return this.highs[radius];
  }

  /** Samples one ring (once per centre) and stores its two levels. */
  private measure(radius: number): void {
    if (radius < 1 || radius > this.maxRadius) {
      throw new RangeError(`Ring radius ${radius} is outside 1..${this.maxRadius}`);
    }
    if (this.measured[radius] !== 0) return;
    this.measured[radius] = 1;

    const wanted = Math.max(8, Math.round(2 * Math.PI * radius));
    let count = 0;
    for (let k = 0; k < wanted; k++) {
      const angle = (k / wanted) * 2 * Math.PI;
      const x = Math.round(this.x + Math.cos(angle) * radius);
      const y = Math.round(this.y + Math.sin(angle) * radius);
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
      this.samples[count++] = this.lum[y * this.width + x];
    }
    if (count === 0) {
      this.lows[radius] = Number.NaN;
      this.highs[radius] = Number.NaN;
      return;
    }
    const ring = this.samples.subarray(0, count).sort();
    this.lows[radius] = ring[Math.min(count - 1, Math.floor(count * LIFT_RING_QUANTILE))];
    this.highs[radius] = ring[Math.min(count - 1, Math.floor(count * LIFT_RING_HIGH_QUANTILE))];
  }
}
