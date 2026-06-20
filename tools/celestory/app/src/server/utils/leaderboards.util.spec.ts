import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMIT, MAX_LIMIT } from './leaderboards.constants';
import {
  classifyPalette,
  parseEquipmentKind,
  parseLimit,
  parseMonth,
  parseMonthView,
  parseObjectMetric,
  parseUserMetric,
  parseYear,
} from './leaderboards.util';

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

describe('metric/view/kind parsing', () => {
  it('accepts allowed values and falls back to the default otherwise', () => {
    expect(parseUserMetric('longevity')).toBe('longevity');
    expect(parseUserMetric('bogus')).toBe('integration');
    expect(parseObjectMetric('rarest')).toBe('rarest');
    expect(parseObjectMetric(undefined)).toBe('integration');
    expect(parseEquipmentKind('optic')).toBe('optic');
    expect(parseEquipmentKind('telescope')).toBe('camera');
    expect(parseMonthView('seasonality')).toBe('seasonality');
    expect(parseMonthView('')).toBe('absolute');
  });
});

describe('parseYear', () => {
  it('accepts a 4-digit year and rejects out-of-range / invalid input', () => {
    expect(parseYear('2025')).toBe(2025);
    expect(parseYear(undefined)).toBeNull();
    expect(parseYear('25')).toBeNull();
    expect(parseYear('abcd')).toBeNull();
  });
});

describe('parseMonth', () => {
  it('normalizes YYYY-MM to a first-of-month date', () => {
    expect(parseMonth('2025-10')).toBe('2025-10-01');
  });

  it('rejects malformed or impossible months', () => {
    expect(parseMonth(undefined)).toBeNull();
    expect(parseMonth('2025-13')).toBeNull();
    expect(parseMonth('2025-00')).toBeNull();
    expect(parseMonth('2025/10')).toBeNull();
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
