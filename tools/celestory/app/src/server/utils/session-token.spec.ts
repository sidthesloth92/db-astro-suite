import { describe, expect, it, vi } from 'vitest';
import { authorizeSession, extractBearer, readSession, signSession } from './session-token';

const HANDLE = 'vera';
const SID = '11111111-1111-1111-1111-111111111111';

describe('session-token', () => {
  it('mints a token that authorizes the same handle + story id', () => {
    const token = signSession(HANDLE, SID);
    expect(authorizeSession(token, HANDLE, SID)).toBe(true);
  });

  it('rejects a token presented for a different handle', () => {
    const token = signSession(HANDLE, SID);
    expect(authorizeSession(token, 'someone-else', SID)).toBe(false);
  });

  it('rejects a token presented for a different story id (reclaimed handle)', () => {
    const token = signSession(HANDLE, SID);
    expect(authorizeSession(token, HANDLE, '22222222-2222-2222-2222-222222222222')).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const token = signSession(HANDLE, SID);
    const [payload] = token.split('.');
    expect(readSession(`${payload}.deadbeef`)).toBeNull();
  });

  it('rejects a tampered payload (signature no longer matches)', () => {
    const token = signSession(HANDLE, SID);
    const [, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ handle: 'mallory', sid: SID, exp: Date.now() + 1000 }))
      .toString('base64url');
    expect(readSession(`${forged}.${sig}`)).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(readSession('')).toBeNull();
    expect(readSession('nodot')).toBeNull();
    expect(readSession('a.b.c')).toBeNull();
  });

  it('rejects an expired token', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const token = signSession(HANDLE, SID);
    // Advance well past the 12h TTL.
    nowSpy.mockReturnValue(1_000_000 + 13 * 60 * 60 * 1000);
    expect(authorizeSession(token, HANDLE, SID)).toBe(false);
    nowSpy.mockRestore();
  });

  describe('extractBearer', () => {
    it('extracts the token from a Bearer header (case-insensitive, trimmed)', () => {
      expect(extractBearer('Bearer abc.def')).toBe('abc.def');
      expect(extractBearer('bearer   abc.def  ')).toBe('abc.def');
    });

    it('returns empty string for missing or non-bearer headers', () => {
      expect(extractBearer(undefined)).toBe('');
      expect(extractBearer('')).toBe('');
      expect(extractBearer('Basic abc')).toBe('');
    });
  });
});
