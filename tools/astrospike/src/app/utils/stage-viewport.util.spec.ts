import {
  clampViewport,
  panViewport,
  viewportOrigin,
  zoomViewportAt,
} from './stage-viewport.util';

const W = 1000;
const H = 800;
const MIN = 1;
const MAX = 8;

describe('stage-viewport.util', () => {
  describe('clampViewport', () => {
    it('should force the centre to the image centre at zoom 1', () => {
      const v = clampViewport({ zoom: 1, centerX: 100, centerY: 700 }, W, H, MIN, MAX);
      expect(v).toEqual({ zoom: 1, centerX: 500, centerY: 400 });
    });

    it('should clamp zoom into the allowed range', () => {
      expect(clampViewport({ zoom: 0.4, centerX: 500, centerY: 400 }, W, H, MIN, MAX).zoom).toBe(1);
      expect(clampViewport({ zoom: 99, centerX: 500, centerY: 400 }, W, H, MIN, MAX).zoom).toBe(8);
    });

    it('should keep the visible rectangle inside the image when zoomed', () => {
      // At zoom 4 the view is 250x200, so the centre may not go below (125, 100).
      const v = clampViewport({ zoom: 4, centerX: 0, centerY: 0 }, W, H, MIN, MAX);
      expect(v.centerX).toBe(125);
      expect(v.centerY).toBe(100);
      const far = clampViewport({ zoom: 4, centerX: W, centerY: H }, W, H, MIN, MAX);
      expect(far.centerX).toBe(875);
      expect(far.centerY).toBe(700);
    });
  });

  describe('zoomViewportAt', () => {
    it('should keep the anchor point stationary through a zoom step', () => {
      const start = { zoom: 2, centerX: 500, centerY: 400 };
      const anchor = { x: 600, y: 300 };
      const zoomed = zoomViewportAt(start, anchor.x, anchor.y, 2, W, H, MIN, MAX);

      expect(zoomed.zoom).toBe(4);
      // The anchor's screen position is (anchor - origin) * zoom / imageSize.
      // Keeping it stationary means (anchor - center) shrinks by zoom ratio.
      expect(anchor.x - zoomed.centerX).toBeCloseTo((anchor.x - start.centerX) / 2, 6);
      expect(anchor.y - zoomed.centerY).toBeCloseTo((anchor.y - start.centerY) / 2, 6);
    });

    it('should return to a whole-image view when zoomed fully out', () => {
      const v = zoomViewportAt({ zoom: 2, centerX: 300, centerY: 300 }, 300, 300, 0.25, W, H, MIN, MAX);
      expect(v).toEqual({ zoom: 1, centerX: 500, centerY: 400 });
    });
  });

  describe('panViewport', () => {
    it('should move the centre by the image-space delta', () => {
      const v = panViewport({ zoom: 4, centerX: 500, centerY: 400 }, 50, -30, W, H, MIN, MAX);
      expect(v.centerX).toBe(550);
      expect(v.centerY).toBe(370);
    });

    it('should stop at the image edge', () => {
      const v = panViewport({ zoom: 4, centerX: 850, centerY: 400 }, 500, 0, W, H, MIN, MAX);
      expect(v.centerX).toBe(875);
    });
  });

  describe('viewportOrigin', () => {
    it('should derive the top-left visible image point', () => {
      expect(viewportOrigin({ zoom: 4, centerX: 500, centerY: 400 }, W, H)).toEqual({
        x: 375,
        y: 300,
      });
      expect(viewportOrigin({ zoom: 1, centerX: 500, centerY: 400 }, W, H)).toEqual({ x: 0, y: 0 });
    });
  });
});
