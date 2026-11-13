import { SRGB_TO_LINEAR, linearToSrgbByte } from './linear-light.util';

describe('linear-light.util', () => {
  describe('SRGB_TO_LINEAR', () => {
    it('should hold one entry per 8-bit channel value', () => {
      expect(SRGB_TO_LINEAR.length).toBe(256);
    });

    it('should map black to exactly 0 and white to exactly 1', () => {
      expect(SRGB_TO_LINEAR[0]).toBe(0);
      expect(SRGB_TO_LINEAR[255]).toBe(1);
    });

    it('should rise strictly with every brighter byte', () => {
      for (let i = 1; i < 256; i++) {
        expect(SRGB_TO_LINEAR[i]).toBeGreaterThan(SRGB_TO_LINEAR[i - 1]);
      }
    });

    it('should stay within [0, 1] for every byte', () => {
      for (let i = 0; i < 256; i++) {
        expect(SRGB_TO_LINEAR[i]).toBeGreaterThanOrEqual(0);
        expect(SRGB_TO_LINEAR[i]).toBeLessThanOrEqual(1);
      }
    });

    it('should place sRGB mid-grey well below half in linear light', () => {
      // The gamma curve is what keeps a blur in linear light from reading as
      // grey haze: byte 128 carries only about 21.6% of white's light.
      expect(SRGB_TO_LINEAR[128]).toBeCloseTo(0.2159, 4);
    });

    it('should follow the sRGB curve on both sides of its linear toe', () => {
      // Byte 10 sits on the linear toe (c <= 0.04045); byte 11 is just past it.
      expect(SRGB_TO_LINEAR[10]).toBeCloseTo(10 / 255 / 12.92, 6);
      expect(SRGB_TO_LINEAR[11]).toBeCloseTo(Math.pow((11 / 255 + 0.055) / 1.055, 2.4), 6);
    });
  });

  describe('linearToSrgbByte', () => {
    it('should map linear 0 to byte 0 and linear 1 to byte 255', () => {
      expect(linearToSrgbByte(0)).toBe(0);
      expect(linearToSrgbByte(1)).toBe(255);
    });

    it('should invert the lookup table exactly for every byte', () => {
      for (let i = 0; i < 256; i++) {
        expect(linearToSrgbByte(SRGB_TO_LINEAR[i])).toBe(i);
      }
    });

    it('should clamp values below 0 to byte 0', () => {
      expect(linearToSrgbByte(-0.25)).toBe(0);
      expect(linearToSrgbByte(-1e-9)).toBe(0);
      expect(linearToSrgbByte(-Infinity)).toBe(0);
    });

    it('should clamp values above 1 to byte 255', () => {
      expect(linearToSrgbByte(1.0000001)).toBe(255);
      expect(linearToSrgbByte(1.6)).toBe(255);
      expect(linearToSrgbByte(Infinity)).toBe(255);
    });

    it('should round to the nearest byte rather than truncate', () => {
      // Linear 0.5 encodes to sRGB 0.7354, which is 187.5 on the byte scale.
      expect(linearToSrgbByte(0.5)).toBe(188);
      // The toe/curve junction lands on byte 10 either way.
      expect(linearToSrgbByte(0.0031308)).toBe(10);
    });

    it('should never fall as the linear value rises', () => {
      let previous = linearToSrgbByte(0);
      for (let step = 1; step <= 1000; step++) {
        const current = linearToSrgbByte(step / 1000);
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    });
  });
});
