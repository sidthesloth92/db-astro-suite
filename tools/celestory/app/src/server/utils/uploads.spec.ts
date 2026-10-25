import { describe, expect, it } from 'vitest';
import { parseUpload } from './uploads';
import { PingIdentityError, PingInvalidError } from './celestory.error';

const INSTALL_ID = '0123456789abcdef0123456789abcdef';
const FINGERPRINT = 'a'.repeat(64);

/** A ping shaped like the web app sends for a CLI-produced story. */
function ping(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    installId: INSTALL_ID,
    dataFingerprint: FINGERPRINT,
    totalIntegrationSeconds: 671_160,
    lightFrameCount: 2_340,
    targetCount: 36,
    ...overrides,
  };
}

describe('parseUpload', () => {
  it('accepts a ping in the CLI format', () => {
    expect(parseUpload(ping())).toEqual({
      installId: INSTALL_ID,
      dataFingerprint: FINGERPRINT,
      totalIntegrationSeconds: 671_160,
      lightFrameCount: 2_340,
      targetCount: 36,
    });
  });

  it('rejects a ping with no upload identity', () => {
    expect(() => parseUpload(ping({ installId: '' }))).toThrow(PingIdentityError);
    expect(() => parseUpload(null)).toThrow(PingIdentityError);
  });

  it('rejects identities that are not in the CLI format', () => {
    expect(() => parseUpload(ping({ installId: 'sample-0000-0000-0000' }))).toThrow(PingInvalidError);
    expect(() => parseUpload(ping({ dataFingerprint: 'abc' }))).toThrow(PingInvalidError);
    expect(() => parseUpload(ping({ installId: INSTALL_ID.toUpperCase() }))).toThrow(PingInvalidError);
  });

  it('rejects totals beyond any real library', () => {
    expect(() => parseUpload(ping({ totalIntegrationSeconds: 360_000_001 }))).toThrow(PingInvalidError);
    expect(() => parseUpload(ping({ lightFrameCount: 10_000_001 }))).toThrow(PingInvalidError);
    expect(() => parseUpload(ping({ targetCount: 5_001 }))).toThrow(PingInvalidError);
  });

  it('treats missing or negative totals as zero', () => {
    expect(parseUpload(ping({ lightFrameCount: -5, targetCount: undefined }))).toMatchObject({
      lightFrameCount: 0,
      targetCount: 0,
    });
  });
});
