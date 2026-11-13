import { formatBytes } from './format-bytes.util';

describe('format-bytes.util', () => {
  describe('formatBytes', () => {
    it('should report small payloads in whole bytes', () => {
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1)).toBe('1 B');
    });

    it('should report kilobyte payloads with one decimal', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(18841)).toBe('18.4 KB');
    });

    it('should report megabyte payloads with one decimal', () => {
      expect(formatBytes(4404019)).toBe('4.2 MB');
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    });

    it('should report zero, negative, and non-finite sizes as zero bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(-100)).toBe('0 B');
      expect(formatBytes(Number.NaN)).toBe('0 B');
      expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 B');
    });
  });
});
