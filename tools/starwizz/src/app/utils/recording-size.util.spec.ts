import { RECORDING_PRESETS } from '../constants/recording.constant';
import {
  computeRecordingBitsPerSecond,
  estimateRecordingSizeMb,
} from './recording-size.util';

describe('recording-size.util', () => {
  describe('computeRecordingBitsPerSecond', () => {
    it('should scale the bitrate with resolution, fps and the preset budget', () => {
      // 1080×1920 × 60fps × 0.10 bpp = 12,441,600
      expect(computeRecordingBitsPerSecond(1080, 1920, RECORDING_PRESETS['social'])).toBe(
        12_441_600,
      );
      // 1080×1920 × 60fps × 0.15 bpp = 18,662,400
      expect(computeRecordingBitsPerSecond(1080, 1920, RECORDING_PRESETS['maximum'])).toBe(
        18_662_400,
      );
      // 1080×1920 × 30fps × 0.07 bpp = 4,354,560
      expect(computeRecordingBitsPerSecond(1080, 1920, RECORDING_PRESETS['compact'])).toBe(
        4_354_560,
      );
    });

    it('should clamp small/slow formats up to the minimum bitrate', () => {
      // 1280×720 × 30fps × 0.07 bpp = 1,935,360 → clamped to 4 Mbps
      expect(computeRecordingBitsPerSecond(1280, 720, RECORDING_PRESETS['compact'])).toBe(
        4_000_000,
      );
    });

    it('should keep 4K on the maximum preset under the upper clamp', () => {
      // 3840×2160 × 60fps × 0.15 bpp = 74,649,600 — below the 80 Mbps cap
      expect(computeRecordingBitsPerSecond(3840, 2160, RECORDING_PRESETS['maximum'])).toBe(
        74_649_600,
      );
    });

    it('should clamp absurd resolutions down to the maximum bitrate', () => {
      expect(computeRecordingBitsPerSecond(7680, 4320, RECORDING_PRESETS['maximum'])).toBe(
        80_000_000,
      );
    });
  });

  describe('estimateRecordingSizeMb', () => {
    it('should convert bitrate × duration into whole megabytes', () => {
      // 12,441,600 bps × 30 s / 8 / 1e6 = 46.656 → 47 MB
      expect(estimateRecordingSizeMb(12_441_600, 30)).toBe(47);
      // 4,354,560 bps × 30 s = 16.33 MB → 16 MB
      expect(estimateRecordingSizeMb(4_354_560, 30)).toBe(16);
    });
  });
});
