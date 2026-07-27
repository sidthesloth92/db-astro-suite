import { sliceCountForValue } from './stars-cut.util';

describe('stars-cut.util', () => {
  describe('sliceCountForValue', () => {
    // Documented mapping n = round(N^v) for the slider sweep, clamped to
    // [1, N] (0 when N = 0).
    const table: ReadonlyArray<{ total: number; expected: readonly number[] }> = [
      { total: 0, expected: [0, 0, 0, 0, 0] },
      { total: 1, expected: [1, 1, 1, 1, 1] },
      { total: 55, expected: [1, 3, 7, 20, 55] },
      { total: 3000, expected: [1, 7, 55, 405, 3000] },
    ];
    const values: readonly number[] = [0, 0.25, 0.5, 0.75, 1];

    for (const row of table) {
      for (let i = 0; i < values.length; i++) {
        it(`should map v=${values[i]} with ${row.total} stars to ${row.expected[i]}`, () => {
          expect(sliceCountForValue(values[i], row.total)).toBe(row.expected[i]);
        });
      }
    }

    it('should clamp slider values below 0 to the v=0 result', () => {
      expect(sliceCountForValue(-0.5, 55)).toBe(sliceCountForValue(0, 55));
      expect(sliceCountForValue(-0.5, 55)).toBe(1);
    });

    it('should clamp slider values above 1 to the v=1 result', () => {
      expect(sliceCountForValue(1.5, 55)).toBe(sliceCountForValue(1, 55));
      expect(sliceCountForValue(1.5, 55)).toBe(55);
    });

    it('should always keep at least one star when any were detected', () => {
      for (const total of [1, 2, 55, 3000]) {
        expect(sliceCountForValue(0, total)).toBe(1);
      }
    });
  });
});
