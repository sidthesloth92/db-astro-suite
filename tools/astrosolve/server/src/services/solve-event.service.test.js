import { test } from "node:test";
import assert from "node:assert/strict";
import {
  outcomeFromStatus,
  summarize,
  byUser,
  queueSaturationStats,
} from "./solve-event.service.js";
import { SolveEventOutcome } from "../models/solve-event.model.js";

test("outcomeFromStatus maps status codes to outcomes", () => {
  assert.equal(outcomeFromStatus(200), SolveEventOutcome.SUCCESS);
  assert.equal(outcomeFromStatus(204), SolveEventOutcome.SUCCESS);
  assert.equal(outcomeFromStatus(401), SolveEventOutcome.AUTH_FAILED);
  assert.equal(outcomeFromStatus(503), SolveEventOutcome.QUEUE_FULL);
  assert.equal(outcomeFromStatus(400), SolveEventOutcome.VALIDATION_ERROR);
  assert.equal(outcomeFromStatus(404), SolveEventOutcome.VALIDATION_ERROR);
  assert.equal(outcomeFromStatus(500), SolveEventOutcome.INTERNAL_ERROR);
});

test("summarize computes totals, success rate, percentiles, and top users", () => {
  const rows = [
    { outcome: "success",          key_id: 1, solve_duration_ms: 1000, total_duration_ms: 1200, file_size_bytes: 100 },
    { outcome: "success",          key_id: 1, solve_duration_ms: 2000, total_duration_ms: 2200, file_size_bytes: 200 },
    { outcome: "success",          key_id: 2, solve_duration_ms: 3000, total_duration_ms: 3300, file_size_bytes: 300 },
    { outcome: "solve_failed",     key_id: 2, solve_duration_ms: null, total_duration_ms: 4400, file_size_bytes: 400 },
    { outcome: "validation_error", key_id: null, solve_duration_ms: null, total_duration_ms: 50, file_size_bytes: null },
  ];

  const s = summarize(rows);
  assert.equal(s.total, 5);
  assert.equal(s.successRate, 3 / 5);
  assert.equal(s.byOutcome.success, 3);
  assert.equal(s.byOutcome.solve_failed, 1);
  assert.equal(s.byOutcome.validation_error, 1);
  assert.equal(s.solveDurationMs.mean, 2000);
  assert.equal(s.solveDurationMs.p50, 2000);
  assert.equal(s.solveDurationMs.p95, 3000);
  // top users: key_id=1 has 2, key_id=2 has 2 — sorted by count then insertion order
  assert.equal(s.topUsers.length, 2);
  assert.equal(s.topUsers[0].count, 2);
});

test("summarize handles empty input", () => {
  const s = summarize([]);
  assert.equal(s.total, 0);
  assert.equal(s.successRate, null);
  assert.equal(s.solveDurationMs.mean, null);
  assert.equal(s.solveDurationMs.p50, null);
  assert.deepEqual(s.topUsers, []);
});

test("byUser groups rows by key_id with per-user stats", () => {
  const rows = [
    { outcome: "success", key_id: 1, solve_duration_ms: 1000, file_size_bytes: 100 },
    { outcome: "success", key_id: 1, solve_duration_ms: 3000, file_size_bytes: 300 },
    { outcome: "solve_failed", key_id: 1, solve_duration_ms: null, file_size_bytes: null },
    { outcome: "success", key_id: 2, solve_duration_ms: 2000, file_size_bytes: 200 },
    { outcome: "auth_failed", key_id: null, solve_duration_ms: null, file_size_bytes: null },
  ];
  const result = byUser(rows);
  // sorted by total descending
  assert.equal(result[0].keyId, "1");
  assert.equal(result[0].total, 3);
  assert.equal(result[0].successRate, 2 / 3);
  assert.equal(result[0].meanSolveDurationMs, 2000);
  const noKey = result.find((r) => r.keyId === "(no key)");
  assert.ok(noKey);
  assert.equal(noKey.total, 1);
  assert.equal(noKey.successRate, 0);
});

test("queueSaturationStats counts queue_full and reports waits", () => {
  const rows = [
    { outcome: "success",    queue_wait_ms: 5,   queue_depth_on_enqueue: 1 },
    { outcome: "success",    queue_wait_ms: 50,  queue_depth_on_enqueue: 4 },
    { outcome: "success",    queue_wait_ms: 200, queue_depth_on_enqueue: 7 },
    { outcome: "queue_full", queue_wait_ms: null,queue_depth_on_enqueue: 10 },
    { outcome: "queue_full", queue_wait_ms: null,queue_depth_on_enqueue: 10 },
  ];
  const q = queueSaturationStats(rows);
  assert.equal(q.queueFullRejections, 2);
  assert.equal(q.queueWaitMs.p50, 50);
  assert.equal(q.queueWaitMs.p95, 200);
  assert.equal(q.maxQueueDepthOnEnqueue, 10);
});
