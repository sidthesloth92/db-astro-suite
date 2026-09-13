import { pointerToImagePoint } from './canvas-coords.util';

describe('canvas-coords.util', () => {
  describe('pointerToImagePoint', () => {
    it('should be the identity when the rect matches the canvas at scale 1', () => {
      const rect = new DOMRect(0, 0, 800, 600);
      const point = pointerToImagePoint(123, 456, rect, 800, 600, 1);
      expect(point.x).toBeCloseTo(123, 6);
      expect(point.y).toBeCloseTo(456, 6);
    });

    it('should map through a CSS-scaled and offset rect', () => {
      // Canvas is 800x600 backing pixels displayed in a 400x300 box at (10, 20).
      const rect = new DOMRect(10, 20, 400, 300);
      const point = pointerToImagePoint(210, 170, rect, 800, 600, 1);
      // canvasX = (210 - 10) * 800 / 400 = 400; canvasY = (170 - 20) * 600 / 300 = 300.
      expect(point.x).toBeCloseTo(400, 6);
      expect(point.y).toBeCloseTo(300, 6);
    });

    it('should divide canvas coordinates by the preview scale', () => {
      // A 400x300 preview canvas of an 800x600 image (previewScale = 0.5).
      const rect = new DOMRect(0, 0, 400, 300);
      const point = pointerToImagePoint(100, 75, rect, 400, 300, 0.5);
      expect(point.x).toBeCloseTo(200, 6);
      expect(point.y).toBeCloseTo(150, 6);
    });

    it('should combine CSS scaling and preview scale', () => {
      // 1000x500 canvas shown in a 500x250 box at (50, 0), previewScale 0.25.
      const rect = new DOMRect(50, 0, 500, 250);
      const point = pointerToImagePoint(300, 125, rect, 1000, 500, 0.25);
      // canvasX = (300 - 50) * 1000 / 500 = 500 -> imageX = 500 / 0.25 = 2000.
      // canvasY = 125 * 500 / 250 = 250 -> imageY = 250 / 0.25 = 1000.
      expect(point.x).toBeCloseTo(2000, 6);
      expect(point.y).toBeCloseTo(1000, 6);
    });
  });
});
