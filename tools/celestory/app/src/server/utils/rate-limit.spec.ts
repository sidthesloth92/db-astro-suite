import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumeRateLimit,
  counterKey,
  handleSubject,
  retryAfterSeconds,
  secondsUntilWindowEnds,
  windowStart,
} from './rate-limit';
import { RateLimitedError } from './celestory.error';
import { LOGIN_FAILURE_LIMIT, PING_LIMIT } from './rate-limit.constants';
import type { RateBucket } from './rate-limit.model';

/** In-memory stand-in for the rate_limits table, keyed by `key|window_start`. */
const counters = vi.hoisted(() => new Map<string, number>());

vi.mock('./db', () => ({
  getDb: () => async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = strings.join('?');
    const id = `${String(values[0])}|${String(values[1])}`;
    if (query.includes('INSERT INTO rate_limits')) {
      const count = (counters.get(id) ?? 0) + 1;
      counters.set(id, count);
      return [{ count }];
    }
    if (query.includes('UPDATE rate_limits')) {
      counters.set(id, Math.max((counters.get(id) ?? 0) - 1, 0));
    }
    return [];
  },
}));

const HOUR = 3600;
const DAY = 86400;
/** 2026-10-24T14:23:10Z */
const NOW = Date.UTC(2026, 9, 24, 14, 23, 10);

describe('windowStart', () => {
  it('aligns to the start of the hour and of the day', () => {
    expect(windowStart(NOW, HOUR).toISOString()).toBe('2026-10-24T14:00:00.000Z');
    expect(windowStart(NOW, DAY).toISOString()).toBe('2026-10-24T00:00:00.000Z');
  });

  it('aligns 15-minute windows to the quarter hour', () => {
    expect(windowStart(NOW, 900).toISOString()).toBe('2026-10-24T14:15:00.000Z');
  });
});

describe('secondsUntilWindowEnds', () => {
  it('counts down to the next window boundary', () => {
    // 14:23:10 → 15:00:00 is 36m50s.
    expect(secondsUntilWindowEnds(NOW, HOUR)).toBe(36 * 60 + 50);
  });

  it('never returns less than one second', () => {
    expect(secondsUntilWindowEnds(Date.UTC(2026, 9, 24, 14, 59, 59, 999), HOUR)).toBe(1);
  });
});

describe('counterKey', () => {
  it('keeps each rule of a bucket on its own counter', () => {
    const [hourly, daily] = PING_LIMIT.rules;
    expect(counterKey(PING_LIMIT, hourly, 'ip:abc')).toBe('ping:3600:ip:abc');
    expect(counterKey(PING_LIMIT, daily, 'ip:abc')).toBe('ping:86400:ip:abc');
  });

  it('names handle subjects', () => {
    expect(counterKey(LOGIN_FAILURE_LIMIT, LOGIN_FAILURE_LIMIT.rules[0], handleSubject('vera'))).toBe(
      'login-fail:900:handle:vera',
    );
  });
});

describe('retryAfterSeconds', () => {
  const bucket: RateBucket = {
    name: 'test',
    rules: [
      { limit: 3, windowSeconds: HOUR },
      { limit: 10, windowSeconds: DAY },
    ],
  };

  it('allows requests at or under every limit', () => {
    expect(retryAfterSeconds(bucket, [3, 10], NOW)).toBeNull();
    expect(retryAfterSeconds(bucket, [1, 1], NOW)).toBeNull();
  });

  it('refuses the 4th hit in an hour until the hour resets', () => {
    expect(retryAfterSeconds(bucket, [4, 4], NOW)).toBe(secondsUntilWindowEnds(NOW, HOUR));
  });

  it('waits for the longest breached window when several are over', () => {
    expect(retryAfterSeconds(bucket, [4, 11], NOW)).toBe(secondsUntilWindowEnds(NOW, DAY));
  });

  it('allows the 5th wrong password in 15 minutes and refuses the 6th', () => {
    const [quarterHour] = LOGIN_FAILURE_LIMIT.rules;
    expect(retryAfterSeconds(LOGIN_FAILURE_LIMIT, [quarterHour.limit, quarterHour.limit], NOW)).toBeNull();
    expect(
      retryAfterSeconds(LOGIN_FAILURE_LIMIT, [quarterHour.limit + 1, quarterHour.limit + 1], NOW),
    ).not.toBeNull();
  });
});

describe('consumeRateLimit', () => {
  const bucket: RateBucket = { name: 'test', rules: [{ limit: 2, windowSeconds: HOUR }] };

  beforeEach(() => {
    counters.clear();
    vi.spyOn(Math, 'random').mockReturnValue(1); // never sweep in these tests
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets hits through up to the limit, then refuses with a retry time', async () => {
    await consumeRateLimit(bucket, 'ip:a');
    await consumeRateLimit(bucket, 'ip:a');
    const refused = consumeRateLimit(bucket, 'ip:a');
    await expect(refused).rejects.toBeInstanceOf(RateLimitedError);
    await expect(refused).rejects.toMatchObject({ statusCode: 429 });
  });

  it('counts each subject separately', async () => {
    await consumeRateLimit(bucket, 'ip:a');
    await consumeRateLimit(bucket, 'ip:a');
    await expect(consumeRateLimit(bucket, 'ip:b')).resolves.toBeDefined();
  });

  it('gives a refunded hit back exactly once', async () => {
    const first = await consumeRateLimit(bucket, 'ip:a');
    await consumeRateLimit(bucket, 'ip:a');
    await first.refund();
    await first.refund(); // second refund is a no-op
    await expect(consumeRateLimit(bucket, 'ip:a')).resolves.toBeDefined();
    await expect(consumeRateLimit(bucket, 'ip:a')).rejects.toBeInstanceOf(RateLimitedError);
  });
});
