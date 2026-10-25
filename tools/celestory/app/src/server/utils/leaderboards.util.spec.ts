import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMIT, MAX_LIMIT } from './leaderboards.constants';
import { classifyPalette, parseLimit, parseScope } from './leaderboards.util';

describe('parseLimit', () => {
  it('returns the default when absent or non-numeric', () => {
    expect(parseLimit(undefined)).toBe(DEFAULT_LIMIT);
    expect(parseLimit('abc')).toBe(DEFAULT_LIMIT);
    expect(parseLimit('0')).toBe(DEFAULT_LIMIT);
    expect(parseLimit('-5')).toBe(DEFAULT_LIMIT);
  });

  it('clamps above the max', () => {
    expect(parseLimit(String(MAX_LIMIT + 100))).toBe(MAX_LIMIT);
  });

  it('accepts a valid in-range limit and the first of an array', () => {
    expect(parseLimit('5')).toBe(5);
    expect(parseLimit(['3', '99'])).toBe(3);
  });
});

describe('parseScope', () => {
  it('accepts the allowed scopes and defaults to all-time otherwise', () => {
    expect(parseScope('year')).toBe('year');
    expect(parseScope('month')).toBe('month');
    expect(parseScope('all')).toBe('all');
    expect(parseScope(undefined)).toBe('all');
    expect(parseScope('decade')).toBe('all');
  });
});

describe('classifyPalette', () => {
  it('classifies mono and dual/tri-band filters as narrowband', () => {
    for (const name of ['Hα', 'OIII', 'SII', 'SV220', 'D2']) {
      expect(classifyPalette(name)).toBe('narrowband');
    }
  });

  it('classifies broadband and unfiltered as broadband', () => {
    for (const name of ['L', 'R', 'G', 'B', 'OSC', 'LPRO', 'No Filter', '']) {
      expect(classifyPalette(name)).toBe('broadband');
    }
  });
});
