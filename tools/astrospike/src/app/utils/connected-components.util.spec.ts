import { SourceComponent } from '../models/detection.types';
import { labelComponents } from './connected-components.util';

/** Builds a binary mask from string rows where '#' marks a set pixel. */
function maskFrom(rows: readonly string[]): {
  mask: Uint8Array;
  width: number;
  height: number;
} {
  const height = rows.length;
  const width = rows[0].length;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mask[y * width + x] = rows[y][x] === '#' ? 1 : 0;
    }
  }
  return { mask, width, height };
}

/** Returns the component's valid pixel indices as a sorted plain array. */
function sortedIndices(component: SourceComponent): number[] {
  return Array.from(component.pixels.subarray(0, component.count)).sort((a, b) => a - b);
}

describe('connected-components.util', () => {
  describe('labelComponents', () => {
    it('should label two separated blobs as two components with correct pixel counts', () => {
      const { mask, width, height } = maskFrom([
        '##....',
        '##....',
        '....##',
        '....##',
      ]);

      const components = labelComponents(mask, width, height, 100);

      expect(components.length).toBe(2);
      expect(components[0].count).toBe(4);
      expect(components[1].count).toBe(4);
      expect(sortedIndices(components[0])).toEqual([0, 1, 6, 7]);
      expect(sortedIndices(components[1])).toEqual([16, 17, 22, 23]);
    });

    it('should merge diagonally touching pixels into one component (8-connectivity)', () => {
      const { mask, width, height } = maskFrom([
        '#..',
        '.#.',
        '..#',
      ]);

      const components = labelComponents(mask, width, height, 100);

      expect(components.length).toBe(1);
      expect(components[0].count).toBe(3);
      expect(sortedIndices(components[0])).toEqual([0, 4, 8]);
    });

    it('should consume a component larger than maxArea without returning it', () => {
      const { mask, width, height } = maskFrom([
        '###..#',
        '###..#',
        '###...',
      ]);

      // 9-pixel blob exceeds maxArea 4 and is dropped; 2-pixel blob survives.
      const components = labelComponents(mask, width, height, 4);

      expect(components.length).toBe(1);
      expect(components[0].count).toBe(2);
      expect(sortedIndices(components[0])).toEqual([5, 11]);
    });

    it('should return a component whose count is exactly maxArea', () => {
      const { mask, width, height } = maskFrom([
        '###..#',
        '###..#',
        '###...',
      ]);

      const components = labelComponents(mask, width, height, 9);

      expect(components.length).toBe(2);
      expect(components[0].count).toBe(9);
      expect(components[1].count).toBe(2);
    });

    it('should return an empty array for an empty mask', () => {
      const { mask, width, height } = maskFrom([
        '....',
        '....',
        '....',
      ]);

      expect(labelComponents(mask, width, height, 100)).toEqual([]);
    });

    it('should label a single isolated pixel as a one-pixel component', () => {
      const { mask, width, height } = maskFrom([
        '...',
        '.#.',
        '...',
      ]);

      const components = labelComponents(mask, width, height, 100);

      expect(components.length).toBe(1);
      expect(components[0].count).toBe(1);
      expect(sortedIndices(components[0])).toEqual([4]);
    });
  });
});
