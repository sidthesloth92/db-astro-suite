import { formatControlSuffix, formatControlValue } from './control-format.util';

describe('control-format.util', () => {
  describe('formatControlValue', () => {
    it('should report the stars control as a resolved count', () => {
      // The "of N" total is a separate, dimmer part of the readout.
      expect(formatControlValue('stars', 1, 68)).toBe('68');
      expect(formatControlSuffix('stars', 68)).toBe('of 68');
    });

    it('should report no stars before any are detected', () => {
      expect(formatControlValue('stars', 0.5, 0)).toBe('0');
      expect(formatControlSuffix('stars', 0)).toBe('of 0');
    });

    it('should give the other controls no trailing total', () => {
      for (const key of ['length', 'chroma', 'diffusion', 'brightness', 'rotation'] as const) {
        expect(formatControlSuffix(key, 68)).toBe('');
      }
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
