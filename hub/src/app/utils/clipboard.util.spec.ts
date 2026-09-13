import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from './clipboard.util';

/**
 * Tests for the SSR-safe clipboard helper. The Clipboard API is stubbed on
 * `navigator` per test; the helper must resolve to a boolean and never throw.
 */
describe('copyToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should resolve false when the Clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', {});

    await expect(copyToClipboard('sortronomy')).resolves.toBe(false);
  });

  it('should resolve true when the clipboard write succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyToClipboard('sortronomy')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('sortronomy');
  });

  it('should resolve false when the clipboard write is rejected', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyToClipboard('sortronomy')).resolves.toBe(false);
  });
});
