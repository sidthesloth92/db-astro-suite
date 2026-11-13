import { DIRECTION_VECTORS, LATERAL_TRAVEL_FRACTION } from '../constants/simulation.constant';
import { computeLateralGlide, lateralGlideFrame } from './lateral-glide.util';

/** How far (world px) the backdrop can pan along an axis before an edge shows. */
function panLimit(frameLength: number, drawnLength: number, scale: number): number {
  return drawnLength / 2 - frameLength / 2 / scale;
}

describe('computeLateralGlide', () => {
  const reels = { width: 1080, height: 1920 };
  const landscapeImage = { width: 1920, height: 1080 };

  it('should zoom in to make room when the image exactly fits the travel axis', () => {
    // A 16:9 image in a 9:16 frame is height-fitted, so Up/Down has no spare image.
    const glide = computeLateralGlide(DIRECTION_VECTORS.up, reels, landscapeImage);

    expect(glide.scale).toBeCloseTo(1 + LATERAL_TRAVEL_FRACTION, 6);
    expect(glide.travel).toBeCloseTo(reels.height * LATERAL_TRAVEL_FRACTION, 6);
  });

  it('should not zoom when the image already overhangs the travel axis', () => {
    // The same image is far wider than the frame, so Left/Right needs no zoom.
    const glide = computeLateralGlide(DIRECTION_VECTORS.left, reels, landscapeImage);

    expect(glide.scale).toBe(1);
    expect(glide.travel).toBeCloseTo(reels.width * LATERAL_TRAVEL_FRACTION, 6);
  });

  it('should zoom only as much as needed when the image partly overhangs the travel axis', () => {
    // Drawn 1200px wide in a 1080px frame: 120px spare, but 324px are needed.
    const glide = computeLateralGlide(
      DIRECTION_VECTORS.right,
      { width: 1080, height: 1080 },
      { width: 1200, height: 1080 },
    );

    expect(glide.scale).toBeGreaterThan(1);
    expect(glide.scale).toBeLessThan(1 + LATERAL_TRAVEL_FRACTION);
    expect(glide.scale).toBeCloseTo((1080 + 324) / 1200, 6);
  });

  it('should use the same zoom for opposite directions', () => {
    const up = computeLateralGlide(DIRECTION_VECTORS.up, reels, landscapeImage);
    const down = computeLateralGlide(DIRECTION_VECTORS.down, reels, landscapeImage);

    expect(up).toEqual(down);
  });

  it('should plan no travel when the frame has no size yet', () => {
    const glide = computeLateralGlide(DIRECTION_VECTORS.left, { width: 0, height: 0 }, landscapeImage);

    expect(glide.travel).toBe(0);
    expect(glide.scale).toBe(1);
  });
});

describe('lateralGlideFrame', () => {
  const frame = { width: 1080, height: 1080 };
  const squareImage = { width: 2000, height: 2000 };

  it('should start with the backdrop pushed against the direction of travel', () => {
    const left = computeLateralGlide(DIRECTION_VECTORS.left, frame, squareImage);
    const down = computeLateralGlide(DIRECTION_VECTORS.down, frame, squareImage);

    // Left moves the backdrop left, so it starts shifted right (and vice versa).
    expect(lateralGlideFrame(DIRECTION_VECTORS.left, left, 0).panX).toBeGreaterThan(0);
    expect(lateralGlideFrame(DIRECTION_VECTORS.right, left, 0).panX).toBeLessThan(0);
    // Down moves the backdrop down, so it starts shifted up (and vice versa).
    expect(lateralGlideFrame(DIRECTION_VECTORS.down, down, 0).panY).toBeLessThan(0);
    expect(lateralGlideFrame(DIRECTION_VECTORS.up, down, 0).panY).toBeGreaterThan(0);
  });

  it('should pass through the image centre halfway and end mirrored about it', () => {
    const glide = computeLateralGlide(DIRECTION_VECTORS.left, frame, squareImage);

    const start = lateralGlideFrame(DIRECTION_VECTORS.left, glide, 0);
    const middle = lateralGlideFrame(DIRECTION_VECTORS.left, glide, glide.travel / 2);
    const end = lateralGlideFrame(DIRECTION_VECTORS.left, glide, glide.travel);

    expect(middle.panX).toBeCloseTo(0, 6);
    expect(end.panX).toBeCloseTo(-start.panX, 6);
  });

  it('should move the backdrop across the screen by exactly the planned travel', () => {
    const glide = computeLateralGlide(DIRECTION_VECTORS.right, frame, squareImage);

    const start = lateralGlideFrame(DIRECTION_VECTORS.right, glide, 0);
    const end = lateralGlideFrame(DIRECTION_VECTORS.right, glide, glide.travel);

    expect((end.panX - start.panX) * glide.scale).toBeCloseTo(glide.travel, 6);
  });

  it('should leave the other axis centred', () => {
    const glide = computeLateralGlide(DIRECTION_VECTORS.left, frame, squareImage);

    expect(lateralGlideFrame(DIRECTION_VECTORS.left, glide, 0).panY).toBeCloseTo(0, 6);
  });

  it('should never expose an edge of the backdrop, even when it had to zoom to fit', () => {
    // Same aspect ratio as the frame: no spare image on either axis.
    const fitted = { width: 1080, height: 1080 };
    const glide = computeLateralGlide(DIRECTION_VECTORS.left, frame, fitted);
    const limit = panLimit(frame.width, fitted.width, glide.scale);

    for (const travelled of [0, glide.travel / 4, glide.travel / 2, glide.travel]) {
      const { panX } = lateralGlideFrame(DIRECTION_VECTORS.left, glide, travelled);
      expect(Math.abs(panX)).toBeLessThanOrEqual(limit + 1e-9);
    }
  });

  it('should hold the end framing if asked for a point beyond the travel', () => {
    const glide = computeLateralGlide(DIRECTION_VECTORS.left, frame, squareImage);

    expect(lateralGlideFrame(DIRECTION_VECTORS.left, glide, glide.travel * 3)).toEqual(
      lateralGlideFrame(DIRECTION_VECTORS.left, glide, glide.travel),
    );
  });
});
