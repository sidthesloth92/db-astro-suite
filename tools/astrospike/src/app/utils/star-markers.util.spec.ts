import { DetectedStar } from '../models/detected-star.model';
import { StarMarkerParams } from '../models/star-marker-params.model';
import { drawStarMarkers } from './star-markers.util';

const CANVAS_SIZE = 120;
const HOVER_RADIUS = 20;

/** Builds a star at the given position with the fields markers never read. */
function makeStar(id: number, x: number, y: number): DetectedStar {
  return {
    id,
    x,
    y,
    flux: 100,
    peak: 1,
    area: 5,
    elongation: 1,
    color: { r: 255, g: 255, b: 255 },
  };
}

/** Builds marker params with nothing to draw, plus selective overrides. */
function makeParams(overrides: Partial<StarMarkerParams> = {}): StarMarkerParams {
  return {
    hoveredStar: null,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    hoverRadiusPx: HOVER_RADIUS,
    lineWidthPx: 2,
    hoverColor: '#00e5ff',
    ...overrides,
  };
}

/** Creates a transparent square canvas context. */
function makeContext(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('2D context unavailable in test');
  }
  return ctx;
}

/** Alpha (0-255) of the pixel at the given canvas coordinates. */
function alphaAt(ctx: CanvasRenderingContext2D, x: number, y: number): number {
  return ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data[3];
}

/** Count of pixels with any opacity across the whole canvas. */
function paintedPixelCount(ctx: CanvasRenderingContext2D): number {
  const { data } = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  let count = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) {
      count++;
    }
  }
  return count;
}

describe('drawStarMarkers', () => {
  it('should draw a ring around the hovered star at its canvas position', () => {
    const ctx = makeContext();

    drawStarMarkers(ctx, makeParams({ hoveredStar: makeStar(0, 60, 60) }));

    // The ring is stroked on the circle of radius 20 around (60, 60).
    expect(alphaAt(ctx, 60 + HOVER_RADIUS, 60)).toBeGreaterThan(0);
    expect(alphaAt(ctx, 60 - HOVER_RADIUS, 60)).toBeGreaterThan(0);
    expect(alphaAt(ctx, 60, 60 + HOVER_RADIUS)).toBeGreaterThan(0);
    // It is a ring, not a disc — the star itself stays visible.
    expect(alphaAt(ctx, 60, 60)).toBe(0);
    expect(alphaAt(ctx, 60 + HOVER_RADIUS / 2, 60)).toBe(0);
  });

  it('should draw the hover ring in the supplied theme color', () => {
    const ctx = makeContext();

    drawStarMarkers(
      ctx,
      makeParams({ hoveredStar: makeStar(0, 60, 60), hoverColor: '#00ff00' }),
    );

    const pixel = ctx.getImageData(60 + HOVER_RADIUS, 60, 1, 1).data;
    expect(pixel[1]).toBeGreaterThan(pixel[0]);
    expect(pixel[1]).toBeGreaterThan(pixel[2]);
  });

  it('should map star coordinates through the preview scale', () => {
    const ctx = makeContext();

    drawStarMarkers(ctx, makeParams({ hoveredStar: makeStar(0, 25, 25), scale: 2 }));

    // Image (25, 25) at scale 2 lands on canvas (50, 50).
    expect(alphaAt(ctx, 50 + HOVER_RADIUS, 50)).toBeGreaterThan(0);
    expect(alphaAt(ctx, 25 + HOVER_RADIUS, 25)).toBe(0);
  });

  it('should shift the ring by the viewport offset', () => {
    const ctx = makeContext();

    drawStarMarkers(
      ctx,
      makeParams({ hoveredStar: makeStar(0, 30, 30), offsetX: 30, offsetY: 30 }),
    );

    expect(alphaAt(ctx, 60 + HOVER_RADIUS, 60)).toBeGreaterThan(0);
    expect(alphaAt(ctx, 30 + HOVER_RADIUS, 30)).toBe(0);
  });

  it('should draw nothing when no star is hovered', () => {
    const ctx = makeContext();

    drawStarMarkers(ctx, makeParams());

    expect(paintedPixelCount(ctx)).toBe(0);
  });

  it('should leave the context state untouched for the next drawing pass', () => {
    const ctx = makeContext();
    ctx.strokeStyle = '#123456';
    ctx.lineWidth = 7;

    drawStarMarkers(ctx, makeParams({ hoveredStar: makeStar(0, 60, 60) }));

    expect(ctx.strokeStyle).toBe('#123456');
    expect(ctx.lineWidth).toBe(7);
    expect(ctx.getLineDash()).toEqual([]);
  });
});
