import { toLuminance } from './luminance.util';

describe('luminance.util', () => {
  describe('toLuminance', () => {
    const cases: ReadonlyArray<{
      name: string;
      rgb: readonly [number, number, number];
      expected: number;
    }> = [
      { name: 'pure red', rgb: [255, 0, 0], expected: 0.2126 * 255 },
      { name: 'pure green', rgb: [0, 255, 0], expected: 0.7152 * 255 },
      { name: 'pure blue', rgb: [0, 0, 255], expected: 0.0722 * 255 },
      { name: 'white', rgb: [255, 255, 255], expected: 255 },
      { name: 'black', rgb: [0, 0, 0], expected: 0 },
    ];

    for (const c of cases) {
      it(`should compute the Rec.709 luma of ${c.name}`, () => {
        const rgba = new Uint8ClampedArray([c.rgb[0], c.rgb[1], c.rgb[2], 255]);
        const lum = toLuminance(rgba, 1, 1);
        expect(lum.data[0]).toBeCloseTo(c.expected, 3);
      });
    }

    it('should return a plane of length width * height with the given dimensions', () => {
      const width = 3;
      const height = 2;
      const rgba = new Uint8ClampedArray(width * height * 4);
      const lum = toLuminance(rgba, width, height);
      expect(lum.data.length).toBe(width * height);
      expect(lum.width).toBe(width);
      expect(lum.height).toBe(height);
    });

    it('should map each pixel independently in row-major order', () => {
      // 2x1 image: red pixel then green pixel.
      const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
      const lum = toLuminance(rgba, 2, 1);
      expect(lum.data[0]).toBeCloseTo(0.2126 * 255, 3);
      expect(lum.data[1]).toBeCloseTo(0.7152 * 255, 3);
    });

    it('should ignore the alpha channel', () => {
      const opaque = toLuminance(new Uint8ClampedArray([120, 80, 40, 255]), 1, 1);
      const transparent = toLuminance(new Uint8ClampedArray([120, 80, 40, 0]), 1, 1);
      expect(transparent.data[0]).toBe(opaque.data[0]);
    });
  });
});
