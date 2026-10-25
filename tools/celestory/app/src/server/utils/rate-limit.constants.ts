/**
 * Abuse limits for the write endpoints. Strict by design: a real user
 * publishes once, updates after an imaging night, and drops a file a few times
 * per session. Tune here only — routes reference these buckets by name.
 */
import type { RateBucket } from './rate-limit.model';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Anonymous visualise/publish pings, per client IP. Blocked pings are invisible to users. */
export const PING_LIMIT: RateBucket = {
  name: 'ping',
  rules: [
    { limit: 3, windowSeconds: HOUR },
    { limit: 10, windowSeconds: DAY },
  ],
};

/** New profiles created, per client IP (successful publishes only). */
export const PUBLISH_LIMIT: RateBucket = {
  name: 'publish',
  rules: [
    { limit: 2, windowSeconds: HOUR },
    { limit: 3, windowSeconds: DAY },
  ],
};

/** Profile re-publishes, per handle (successful updates only). */
export const UPDATE_LIMIT: RateBucket = {
  name: 'update',
  rules: [
    { limit: 3, windowSeconds: HOUR },
    { limit: 10, windowSeconds: DAY },
  ],
};

/**
 * Wrong passwords, per handle, across every route that checks one (login,
 * delete, password-authorized update). Only failures count, so a correct
 * password never uses up the allowance.
 */
export const LOGIN_FAILURE_LIMIT: RateBucket = {
  name: 'login-fail',
  rules: [
    { limit: 5, windowSeconds: 15 * MINUTE },
    { limit: 20, windowSeconds: DAY },
  ],
};

/** Recovery-code attempts, per handle (own bucket, so a login lockout never blocks recovery). */
export const RECOVERY_LIMIT: RateBucket = {
  name: 'recover',
  rules: [
    { limit: 3, windowSeconds: HOUR },
    { limit: 5, windowSeconds: DAY },
  ],
};

/** Owner display-name edits, per handle. */
export const NAME_EDIT_LIMIT: RateBucket = {
  name: 'name',
  rules: [
    { limit: 5, windowSeconds: HOUR },
    { limit: 10, windowSeconds: DAY },
  ],
};

/** Counter rows older than this are deleted (longest window is one day). */
export const RATE_LIMIT_RETENTION_SECONDS = 2 * DAY;

/** Fraction of counted hits that also sweep expired rows (keeps the table small without a cron). */
export const RATE_LIMIT_SWEEP_PROBABILITY = 0.02;
