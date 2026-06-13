/**
 * Unit tests for the queue-depth watchdog. Uses node:test mock timers so the
 * interval behaviour is deterministic — no real waiting.
 */
import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { startQueueWatchdog } from "./queue-watchdog.util.js";

describe("startQueueWatchdog", () => {
  it("logs info when healthy, warns when slots are saturated, and stops cleanly", () => {
    mock.timers.enable({ apis: ["setInterval"] });
    try {
      const calls = [];
      const log = {
        info: () => calls.push("info"),
        warn: () => calls.push("warn"),
      };
      const queue = { size: 0, pending: 1 };
      const stop = startQueueWatchdog({
        queue,
        concurrency: 2,
        intervalMs: 1000,
        log,
      });

      mock.timers.tick(1000);
      assert.equal(calls.at(-1), "info");

      // All slots busy AND work backed up behind them → warn.
      queue.size = 3;
      queue.pending = 2;
      mock.timers.tick(1000);
      assert.equal(calls.at(-1), "warn");

      stop();
      mock.timers.tick(1000); // nothing further after stop
      assert.equal(calls.length, 2);
    } finally {
      mock.timers.reset();
    }
  });
});
