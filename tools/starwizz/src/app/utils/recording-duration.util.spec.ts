import { clampSecondsInput } from './recording-duration.util';

describe('clampSecondsInput', () => {
  it('should pass through an in-range whole number', () => {
    expect(clampSecondsInput('30', 1, 300, 15)).toBe(30);
  });

  it('should clamp values below the minimum', () => {
    expect(clampSecondsInput('0', 1, 300, 15)).toBe(1);
    expect(clampSecondsInput('-5', 1, 300, 15)).toBe(1);
  });

  it('should clamp values above the maximum', () => {
    expect(clampSecondsInput('9999', 1, 300, 15)).toBe(300);
  });

  it('should floor fractional seconds', () => {
    expect(clampSecondsInput('12.9', 1, 300, 15)).toBe(12);
  });

  it('should fall back on non-numeric input', () => {
    expect(clampSecondsInput('abc', 1, 300, 15)).toBe(15);
    expect(clampSecondsInput('', 1, 300, 15)).toBe(15);
  });
});
