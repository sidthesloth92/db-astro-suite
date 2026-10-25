import { describe, expect, it } from 'vitest';
import { pickOrigin } from './origin.util';

describe('pickOrigin', () => {
  it('pins to the configured domain, even when the request came on another host', () => {
    expect(pickOrigin('https://celestory.dbastrosuite.com/', 'https://celestory-abc123.vercel.app', '')).toBe(
      'https://celestory.dbastrosuite.com',
    );
  });

  it('follows the request host when nothing is configured', () => {
    expect(pickOrigin('', 'http://localhost:5173/', '')).toBe('http://localhost:5173');
  });

  it('falls back to the browser origin last', () => {
    expect(pickOrigin('', null, 'http://localhost:5173')).toBe('http://localhost:5173');
  });
});
