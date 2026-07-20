import { describe, expect, it } from 'vitest';
import { detectOsFromUserAgent } from './detect-os.util';

/**
 * Tests for the user-agent OS sniff backing the install-tab preselection.
 * Pure string-in / string-out, so no TestBed or DOM is needed.
 */
describe('detectOsFromUserAgent', () => {
  it('should detect Windows from a Windows user agent', () => {
    expect(
      detectOsFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
    ).toBe('windows');
  });

  it('should detect macOS from a Macintosh user agent', () => {
    expect(
      detectOsFromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
    ).toBe('mac');
  });

  it('should detect Linux from an X11 user agent', () => {
    expect(detectOsFromUserAgent('Mozilla/5.0 (X11; Ubuntu)')).toBe('linux');
  });

  it('should return an empty string for an unrecognised user agent', () => {
    expect(detectOsFromUserAgent('Mozilla/5.0 (PlayStation; 5.0)')).toBe('');
  });
});
