import { SolveEventDao } from "../dao/solve-event.dao.js";
import { SolveEventOutcome } from "../models/solve-event.model.js";

/**
 * Best-effort write of a single solve event. Never throws — logs and swallows
 * any DAO failure so analytics can never break a request.
 *
 * @param {SolveEventDao} dao
 * @param {Object} event
 * @param {Object} log - pino-compatible logger
 */
export function recordEvent(dao, event, log) {
  try {
    dao.insertEvent(event);
  } catch (err) {
    log.error({ err }, "Failed to insert solve_event row");
  }
}

/**
 * Maps a final HTTP status code to a fallback outcome. Used as a safety net
 * in the analytics hook for paths that did not explicitly set `outcome`.
 *
 * @param {number} statusCode
 * @returns {string} one of SolveEventOutcome
 */
export function outcomeFromStatus(statusCode) {
  if (statusCode >= 200 && statusCode < 300) return SolveEventOutcome.SUCCESS;
  if (statusCode === 401) return SolveEventOutcome.AUTH_FAILED;
  if (statusCode === 499) return SolveEventOutcome.CLIENT_ABORTED;
  if (statusCode === 503) return SolveEventOutcome.QUEUE_FULL;
  if (statusCode === 504) return SolveEventOutcome.SOLVE_TIMEOUT;
  if (statusCode >= 400 && statusCode < 500)
    return SolveEventOutcome.VALIDATION_ERROR;
  return SolveEventOutcome.INTERNAL_ERROR;
}

/**
 * Maps a final HTTP status code to a fallback API response code. Used as a
 * safety net in the analytics hook for paths that did not explicitly set
 * `response_code`. Mirrors {@link outcomeFromStatus} so the two columns
 * stay in sync without two divergent switch ladders.
 *
 * @param {number} statusCode
 * @returns {string} one of the API contract `code` values
 */
export function responseCodeFromStatus(statusCode) {
  if (statusCode >= 200 && statusCode < 300) return "SOLVE_SUCCESS";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 499) return "CLIENT_CLOSED_REQUEST";
  if (statusCode === 503) return "SERVER_BUSY";
  if (statusCode === 504) return "SOLVE_TIMEOUT";
  if (statusCode >= 400 && statusCode < 500) return "VALIDATION_ERROR";
  return "SOLVE_FAILED";
}

/**
 * Percentile helper. Returns null for an empty array.
 *
 * @param {number[]} sorted - Numbers sorted ascending
 * @param {number} p - Percentile in (0, 100]
 */
function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

function mean(values) {
  if (values.length === 0) return null;
  let total = 0;
  for (const v of values) total += v;
  return total / values.length;
}

/**
 * Computes aggregate statistics across a set of event rows.
 * Pure function — no DAO access, fully testable.
 *
 * @param {Object[]} rows
 */
export function summarize(rows) {
  const total = rows.length;
  const byOutcome = {};
  const solveDurations = [];
  const totalDurations = [];
  const fileSizes = [];
  const userCounts = new Map();
  let successCount = 0;

  for (const row of rows) {
    byOutcome[row.outcome] = (byOutcome[row.outcome] ?? 0) + 1;
    if (row.outcome === SolveEventOutcome.SUCCESS) successCount += 1;
    if (row.solve_duration_ms != null) solveDurations.push(row.solve_duration_ms);
    if (row.total_duration_ms != null) totalDurations.push(row.total_duration_ms);
    if (row.file_size_bytes != null) fileSizes.push(row.file_size_bytes);
    if (row.key_id != null) {
      userCounts.set(row.key_id, (userCounts.get(row.key_id) ?? 0) + 1);
    }
  }

  solveDurations.sort((a, b) => a - b);
  totalDurations.sort((a, b) => a - b);

  const topUsers = [...userCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keyId, count]) => ({ keyId, count }));

  return {
    total,
    successRate: total === 0 ? null : successCount / total,
    byOutcome,
    solveDurationMs: {
      mean: mean(solveDurations),
      p50: percentile(solveDurations, 50),
      p95: percentile(solveDurations, 95),
    },
    totalDurationMs: {
      mean: mean(totalDurations),
      p50: percentile(totalDurations, 50),
      p95: percentile(totalDurations, 95),
    },
    fileSizeBytes: {
      mean: mean(fileSizes),
      p50: percentile(fileSizes, 50),
      p95: percentile(fileSizes, 95),
    },
    topUsers,
  };
}

/**
 * Per-user breakdown.
 *
 * @param {Object[]} rows
 */
export function byUser(rows) {
  const buckets = new Map();
  for (const row of rows) {
    const key = row.key_id == null ? "(no key)" : String(row.key_id);
    if (!buckets.has(key)) {
      buckets.set(key, { total: 0, success: 0, durations: [], fileSizes: [] });
    }
    const b = buckets.get(key);
    b.total += 1;
    if (row.outcome === SolveEventOutcome.SUCCESS) b.success += 1;
    if (row.solve_duration_ms != null) b.durations.push(row.solve_duration_ms);
    if (row.file_size_bytes != null) b.fileSizes.push(row.file_size_bytes);
  }
  return [...buckets.entries()]
    .map(([keyId, b]) => ({
      keyId,
      total: b.total,
      successRate: b.total === 0 ? null : b.success / b.total,
      meanSolveDurationMs: mean(b.durations),
      meanFileSizeBytes: mean(b.fileSizes),
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Queue saturation stats: count of queue_full rejections, p95 of queue_wait_ms,
 * and the maximum queue_depth_on_enqueue observed.
 *
 * @param {Object[]} rows
 */
export function queueSaturationStats(rows) {
  const waits = [];
  let queueFull = 0;
  let maxDepth = null;
  for (const row of rows) {
    if (row.outcome === SolveEventOutcome.QUEUE_FULL) queueFull += 1;
    if (row.queue_wait_ms != null) waits.push(row.queue_wait_ms);
    if (
      row.queue_depth_on_enqueue != null &&
      (maxDepth == null || row.queue_depth_on_enqueue > maxDepth)
    ) {
      maxDepth = row.queue_depth_on_enqueue;
    }
  }
  waits.sort((a, b) => a - b);
  return {
    queueFullRejections: queueFull,
    queueWaitMs: { p50: percentile(waits, 50), p95: percentile(waits, 95) },
    maxQueueDepthOnEnqueue: maxDepth,
  };
}

/**
 * Returns the most recent N rows.
 *
 * @param {SolveEventDao} dao
 * @param {number} limit
 */
export function recentEvents(dao, limit) {
  return dao.listRecent(limit);
}

/**
 * Returns the most recent N non-success rows.
 *
 * @param {SolveEventDao} dao
 * @param {number} limit
 */
export function recentFailures(dao, limit) {
  return dao.listRecentFailures(limit);
}

/**
 * Returns rows from the last `days` days.
 *
 * @param {SolveEventDao} dao
 * @param {number} days
 */
export function eventsInLastDays(dao, days) {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const since = new Date(sinceMs).toISOString().replace("T", " ").slice(0, 19);
  return dao.listSince(since);
}
