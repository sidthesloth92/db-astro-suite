/**
 * Fixed-window rate limiter backed by the `rate_limits` table. Each hit adds 1
 * to one counter row per rule (key = bucket + window size + subject, window =
 * epoch-aligned start); a request over any rule's limit is refused with a
 * RateLimitedError (429 + Retry-After) before the route does its real work.
 *
 * Hits are always counted first, with an atomic upsert, so concurrent requests
 * can't all slip under the limit. A route that only wants to count some
 * outcomes (wrong passwords, successful publishes) refunds the hit afterwards
 * via the returned reservation.
 */
import { getDb } from './db';
import { RateLimitedError } from './celestory.error';
import {
  RATE_LIMIT_RETENTION_SECONDS,
  RATE_LIMIT_SWEEP_PROBABILITY,
} from './rate-limit.constants';
import type { RateBucket, RateReservation, RateRule } from './rate-limit.model';

/** Start of the epoch-aligned window of `windowSeconds` that contains `nowMs`. */
export function windowStart(nowMs: number, windowSeconds: number): Date {
  const size = windowSeconds * 1000;
  return new Date(Math.floor(nowMs / size) * size);
}

/** Whole seconds (≥ 1) until the window containing `nowMs` ends. */
export function secondsUntilWindowEnds(nowMs: number, windowSeconds: number): number {
  const size = windowSeconds * 1000;
  const end = (Math.floor(nowMs / size) + 1) * size;
  return Math.max(1, Math.ceil((end - nowMs) / 1000));
}

/** Counter key for one rule of a bucket and subject, e.g. `ping:3600:ip:ab12…`. */
export function counterKey(bucket: RateBucket, rule: RateRule, subject: string): string {
  return `${bucket.name}:${rule.windowSeconds}:${subject}`;
}

/** Rate-limit subject for a profile handle. */
export function handleSubject(handle: string): string {
  return `handle:${handle}`;
}

/**
 * Seconds to wait when any rule's count exceeds its limit, else null. When
 * several rules are breached, the longest wait wins. `counts` line up with
 * `bucket.rules`.
 */
export function retryAfterSeconds(
  bucket: RateBucket,
  counts: readonly number[],
  nowMs: number,
): number | null {
  let wait: number | null = null;
  bucket.rules.forEach((rule, index) => {
    if ((counts[index] ?? 0) > rule.limit) {
      const seconds = secondsUntilWindowEnds(nowMs, rule.windowSeconds);
      wait = wait === null ? seconds : Math.max(wait, seconds);
    }
  });
  return wait;
}

/** Add one hit to a counter row and return its new count (atomic upsert). */
async function increment(key: string, start: Date): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, ${start.toISOString()}, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limits.count + 1
    RETURNING count
  `;
  return Number((rows[0] as { count: number | string }).count);
}

/** Take one hit back from a counter row (never below zero). */
async function decrement(key: string, start: Date): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE rate_limits SET count = GREATEST(count - 1, 0)
    WHERE key = ${key} AND window_start = ${start.toISOString()}
  `;
}

/** Occasionally delete expired counter rows; a failed sweep never fails the request. */
async function maybeSweep(nowMs: number): Promise<void> {
  if (Math.random() >= RATE_LIMIT_SWEEP_PROBABILITY) {
    return;
  }
  const cutoff = new Date(nowMs - RATE_LIMIT_RETENTION_SECONDS * 1000).toISOString();
  try {
    const sql = getDb();
    await sql`DELETE FROM rate_limits WHERE window_start < ${cutoff}`;
  } catch (sweepError) {
    console.error('rate-limit sweep failed (non-fatal):', sweepError);
  }
}

/**
 * Count one hit against every rule of `bucket` for `subject`, then throw
 * RateLimitedError if any limit is now exceeded. Returns a reservation whose
 * `refund()` gives the hit back — for outcomes the route decides shouldn't
 * count (a correct password, a publish that failed).
 */
export async function consumeRateLimit(
  bucket: RateBucket,
  subject: string,
): Promise<RateReservation> {
  const nowMs = Date.now();
  const slots = bucket.rules.map((rule) => ({
    key: counterKey(bucket, rule, subject),
    start: windowStart(nowMs, rule.windowSeconds),
  }));
  const counts = await Promise.all(slots.map((slot) => increment(slot.key, slot.start)));
  await maybeSweep(nowMs);

  const wait = retryAfterSeconds(bucket, counts, nowMs);
  if (wait !== null) {
    throw new RateLimitedError(wait);
  }

  let refunded = false;
  return {
    async refund(): Promise<void> {
      if (refunded) {
        return;
      }
      refunded = true;
      try {
        await Promise.all(slots.map((slot) => decrement(slot.key, slot.start)));
      } catch (refundError) {
        console.error(`rate-limit refund failed for ${bucket.name} (non-fatal):`, refundError);
      }
    },
  };
}
