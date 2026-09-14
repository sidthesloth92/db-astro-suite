import { FIT_TEXT_WIDTH_MARGIN, fitFontSize } from './fit-text.util';

describe('fitFontSize', () => {
  it('should keep the designed size when the line already fits', () => {
    expect(fitFontSize(64, 20, 472, 300)).toBe(64);
  });

  it('should shrink a line that is too wide so it fits inside the safety margin', () => {
    const size = fitFontSize(64, 20, 472, 800);

    expect(size).toBeLessThan(64);
    // Width scales with size, so the fitted line must land inside the margin.
    expect((800 * size) / 64).toBeLessThanOrEqual(472 * FIT_TEXT_WIDTH_MARGIN);
  });

  it('should settle on a half-pixel step', () => {
    expect((fitFontSize(64, 20, 472, 777) * 2) % 1).toBe(0);
  });

  it('should never go below the minimum, leaving the caller to wrap instead', () => {
    expect(fitFontSize(64, 20, 100, 5000)).toBe(20);
  });

  it('should never grow a short line past its designed size', () => {
    expect(fitFontSize(44, 12, 1000, 60)).toBe(44);
  });

  it('should fall back to the designed size when nothing has been measured yet', () => {
    expect(fitFontSize(44, 12, 0, 0)).toBe(44);
  });
});
