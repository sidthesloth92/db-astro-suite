import { describe, expect, it } from 'vitest';
import { hashClientIp } from './client-ip.util';

describe('hashClientIp', () => {
  it('is stable for the same IP so its counters line up', () => {
    expect(hashClientIp('203.0.113.7')).toBe(hashClientIp('203.0.113.7'));
    expect(hashClientIp(' 203.0.113.7 ')).toBe(hashClientIp('203.0.113.7'));
  });

  it('gives different IPs different subjects', () => {
    expect(hashClientIp('203.0.113.7')).not.toBe(hashClientIp('203.0.113.8'));
  });

  it('never stores the raw address', () => {
    const hashed = hashClientIp('203.0.113.7');
    expect(hashed).not.toContain('203.0.113.7');
    expect(hashed).toMatch(/^[0-9a-f]{32}$/);
  });
});
