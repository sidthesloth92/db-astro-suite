import { describe, expect, it } from 'vitest';
import { formatSkyRate, formatSkyTime } from './sky-time-format.util';

describe('sky-time-format.util', () => {
  it('labels playback rates', () => {
    expect(formatSkyRate(0, false)).toBe('Paused');
    expect(formatSkyRate(1, true)).toBe('Live');
    expect(formatSkyRate(1, false)).toBe('1×');
    expect(formatSkyRate(60, false)).toBe('1 min/s');
    expect(formatSkyRate(600, false)).toBe('10 min/s');
    expect(formatSkyRate(3600, false)).toBe('1 h/s');
  });

  it('formats a date with a separator between day and time', () => {
    const s = formatSkyTime(new Date(2026, 9, 24, 18, 42));
    expect(s).toContain('·');
    expect(s.length).toBeGreaterThan(10);
  });
});
