import { formatControlValue } from './control-format.util';

describe('control-format.util', () => {
  describe('formatControlValue', () => {
    it('should report the stars control as a resolved count against the detection total', () => {
      expect(formatControlValue('stars', 1, 68)).toBe('68 of 68');
      expect(formatControlValue('stars', 0, 68)).toBe('1 of 68');
    });

    it('should report the stars control as zero of zero before any stars are detected', () => {
      expect(formatControlValue('stars', 0.75, 0)).toBe('0 of 0');
    });

    it('should report rotation in whole degrees', () => {
      expect(formatControlValue('rotation', 0, 68)).toBe('0°');
      expect(formatControlValue('rotation', 15, 68)).toBe('15°');
      expect(formatControlValue('rotation', 44.6, 68)).toBe('45°');
    });

    it('should report length and brightness as a multiplier', () => {
      expect(formatControlValue('length', 1.4, 68)).toBe('1.4×');
      expect(formatControlValue('brightness', 0.2, 68)).toBe('0.2×');
    });

    it('should drop trailing zeros from a whole multiplier', () => {
      expect(formatControlValue('length', 1, 68)).toBe('1×');
      expect(formatControlValue('brightness', 2, 68)).toBe('2×');
    });

    it('should keep the second decimal of a half-step multiplier', () => {
      expect(formatControlValue('length', 1.05, 68)).toBe('1.05×');
    });

    it('should absorb floating-point drift from stepped slider values', () => {
      expect(formatControlValue('length', 1.4000000000000001, 68)).toBe('1.4×');
    });
  });
});
