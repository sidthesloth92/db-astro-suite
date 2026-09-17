import { boxBlurPlane } from './box-blur.util';

const SIZE = 41;
const CENTER = 20;

/** Builds a zero plane of the given size with a unit impulse at (x, y). */
function impulsePlane(width: number, height: number, x: number, y: number): Float32Array {
  const plane = new Float32Array(width * height);
  plane[y * width + x] = 1;
  return plane;
}

/** Builds a plane of the given size filled with one value. */
function constantPlane(width: number, height: number, value: number): Float32Array {
  return new Float32Array(width * height).fill(value);
}

/** Reads the value of a row-major plane at (x, y). */
function valueAt(plane: Float32Array, width: number, x: number, y: number): number {
  return plane[y * width + x];
}

/** Sums every value of a plane. */
function totalOf(plane: Float32Array): number {
  let total = 0;
  for (let i = 0; i < plane.length; i++) {
    total += plane[i];
  }
  return total;
}

/** Furthest offset from the centre along +x that still holds light. */
function reachOf(plane: Float32Array): number {
  let reach = 0;
  for (let d = 1; d <= CENTER; d++) {
    if (valueAt(plane, SIZE, CENTER + d, CENTER) > 0) {
      reach = d;
    }
  }
  return reach;
}

/** Blurs a centred unit impulse on the standard square plane. */
function blurredImpulse(radius: number, passes: number): Float32Array {
  return boxBlurPlane(impulsePlane(SIZE, SIZE, CENTER, CENTER), SIZE, SIZE, radius, passes);
}

describe('boxBlurPlane', () => {
  it('should return an equal copy that does not alias the input at radius 0', () => {
    const input = Float32Array.from([1, 2, 3, 4, 5, 6]);
    const result = boxBlurPlane(input, 3, 2, 0, 3);

    expect(result).not.toBe(input);
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6]);
    result[0] = 99;
    expect(input[0]).toBe(1);
  });

  it('should return a copy when asked for no passes', () => {
    const input = Float32Array.from([1, 2, 3, 4]);
    const result = boxBlurPlane(input, 2, 2, 2, 0);

    expect(result).not.toBe(input);
    expect(Array.from(result)).toEqual([1, 2, 3, 4]);
  });

  it('should leave the input plane untouched', () => {
    const input = impulsePlane(9, 9, 4, 4);
    const before = Array.from(input);
    boxBlurPlane(input, 9, 9, 2, 3);

    expect(Array.from(input)).toEqual(before);
  });

  it('should keep a constant plane constant right up to the borders', () => {
    const width = 7;
    const height = 5;
    const result = boxBlurPlane(constantPlane(width, height, 0.75), width, height, 2, 3);

    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(0.75, 6);
    }
  });

  it('should keep a constant plane constant when the radius exceeds the plane', () => {
    const result = boxBlurPlane(constantPlane(3, 3, 0.4), 3, 3, 10, 3);

    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(0.4, 6);
    }
  });

  it('should conserve the total light of an interior impulse', () => {
    const result = blurredImpulse(3, 3);

    expect(Math.abs(totalOf(result) - 1)).toBeLessThan(1e-3);
  });

  it('should spread an impulse symmetrically about its centre in x and y', () => {
    const result = blurredImpulse(3, 3);

    for (let d = 1; d <= 9; d++) {
      const right = valueAt(result, SIZE, CENTER + d, CENTER);
      const left = valueAt(result, SIZE, CENTER - d, CENTER);
      const below = valueAt(result, SIZE, CENTER, CENTER + d);
      const above = valueAt(result, SIZE, CENTER, CENTER - d);
      expect(right).toBeGreaterThan(0);
      expect(left).toBeCloseTo(right, 7);
      expect(below).toBeCloseTo(right, 7);
      expect(above).toBeCloseTo(right, 7);
    }
  });

  it('should spread a 1-D impulse evenly across the box window', () => {
    const row = boxBlurPlane(Float32Array.from([0, 0, 1, 0, 0]), 5, 1, 1, 1);
    const column = boxBlurPlane(Float32Array.from([0, 0, 1, 0, 0]), 1, 5, 1, 1);

    for (const result of [row, column]) {
      expect(result[0]).toBe(0);
      expect(result[1]).toBeCloseTo(1 / 3, 6);
      expect(result[2]).toBeCloseTo(1 / 3, 6);
      expect(result[3]).toBeCloseTo(1 / 3, 6);
      expect(result[4]).toBe(0);
    }
  });

  it('should replicate the border value instead of padding the edge with black', () => {
    // Zero padding would give 1/3 at the edge; replication counts the edge
    // pixel for the off-plane sample too and gives 2/3.
    const row = boxBlurPlane(Float32Array.from([1, 0, 0, 0, 0]), 5, 1, 1, 1);
    const column = boxBlurPlane(Float32Array.from([1, 0, 0, 0, 0]), 1, 5, 1, 1);

    for (const result of [row, column]) {
      expect(result[0]).toBeCloseTo(2 / 3, 6);
      expect(result[1]).toBeCloseTo(1 / 3, 6);
      expect(result[2]).toBe(0);
      expect(result[3]).toBe(0);
      expect(result[4]).toBe(0);
    }
  });

  it('should reach exactly radius pixels per pass from an impulse', () => {
    expect(reachOf(blurredImpulse(3, 1))).toBe(3);
    expect(reachOf(blurredImpulse(3, 2))).toBe(6);
    expect(reachOf(blurredImpulse(3, 3))).toBe(9);
  });

  it('should lower the impulse peak as the radius grows', () => {
    const peaks = [1, 2, 4, 8].map((radius) =>
      valueAt(blurredImpulse(radius, 3), SIZE, CENTER, CENTER),
    );

    expect(peaks[0]).toBeLessThan(1);
    for (let i = 1; i < peaks.length; i++) {
      expect(peaks[i]).toBeGreaterThan(0);
      expect(peaks[i]).toBeLessThan(peaks[i - 1]);
    }
  });

  it('should never produce negative light from a non-negative plane', () => {
    const width = 30;
    const height = 20;
    const plane = new Float32Array(width * height);
    for (let i = 0; i < plane.length; i++) {
      plane[i] = (i * 7919) % 13 === 0 ? 1 : 0;
    }
    const result = boxBlurPlane(plane, width, height, 3, 3);

    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(0);
    }
  });

  it('should treat a fractional radius as its floor', () => {
    const exact = blurredImpulse(2, 3);
    const fractional = blurredImpulse(2.9, 3);

    expect(Array.from(fractional)).toEqual(Array.from(exact));
  });

  it('should blur a single-row plane along that row only', () => {
    const result = boxBlurPlane(Float32Array.from([0, 0, 0, 1, 0, 0, 0]), 7, 1, 1, 3);

    expect(result.length).toBe(7);
    expect(Math.abs(totalOf(result) - 1)).toBeLessThan(1e-3);
    expect(result[3]).toBeGreaterThan(result[2]);
    expect(result[2]).toBeCloseTo(result[4], 7);
  });

  it('should blur a single-column plane along that column only', () => {
    const result = boxBlurPlane(Float32Array.from([0, 0, 0, 1, 0, 0, 0]), 1, 7, 1, 3);

    expect(result.length).toBe(7);
    expect(Math.abs(totalOf(result) - 1)).toBeLessThan(1e-3);
    expect(result[3]).toBeGreaterThan(result[2]);
    expect(result[2]).toBeCloseTo(result[4], 7);
  });

  it('should leave a 1x1 plane unchanged', () => {
    const result = boxBlurPlane(Float32Array.from([0.6]), 1, 1, 5, 3);

    expect(result.length).toBe(1);
    expect(result[0]).toBeCloseTo(0.6, 6);
  });
});
