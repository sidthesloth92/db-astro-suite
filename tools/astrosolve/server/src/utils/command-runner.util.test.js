/**
 * Unit tests for the process-group-killing command runner. The point of this
 * module is that the returned promise ALWAYS settles — even when the command
 * hangs past its timeout — so a queue slot can never leak. These tests prove
 * that contract directly against real child processes.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runCommandWithTimeout } from "./command-runner.util.js";

describe("runCommandWithTimeout", () => {
  it("captures stdout and reports no execError on a clean exit", async () => {
    const { stdout, stderr, durationMs, execError } = await runCommandWithTimeout(
      "echo hello",
      { timeoutMs: 5000 },
    );
    assert.equal(stdout.trim(), "hello");
    assert.equal(stderr, "");
    assert.equal(execError, null);
    assert.equal(typeof durationMs, "number");
  });

  it("captures stderr from a command that writes to fd 2", async () => {
    const { stderr, execError } = await runCommandWithTimeout(
      "echo oops 1>&2",
      { timeoutMs: 5000 },
    );
    assert.match(stderr, /oops/);
    assert.equal(execError, null); // exit code still 0
  });

  it("surfaces a non-zero exit code via execError.code without killing", async () => {
    const { execError } = await runCommandWithTimeout("exit 3", {
      timeoutMs: 5000,
    });
    assert.ok(execError, "expected an execError for a non-zero exit");
    assert.equal(execError.code, 3);
    assert.equal(execError.killed, false);
  });

  it("kills a command that exceeds the timeout and still SETTLES (no leak)", async () => {
    const startedAt = Date.now();
    const { execError } = await runCommandWithTimeout("sleep 30", {
      timeoutMs: 150,
      killGraceMs: 100,
    });
    const elapsed = Date.now() - startedAt;
    assert.ok(execError, "expected an execError for a timed-out command");
    assert.equal(execError.killed, true);
    // Settled far sooner than the 30s the command would otherwise run.
    assert.ok(elapsed < 5000, `expected prompt settle, took ${elapsed}ms`);
  });

  it("escalates to SIGKILL when the process ignores SIGTERM", async () => {
    // sh traps (ignores) SIGTERM and busy-loops, so only the follow-up SIGKILL
    // to the process group can take it down — proving the escalation path.
    const { execError } = await runCommandWithTimeout(
      'trap "" TERM; while :; do :; done',
      { timeoutMs: 150, killGraceMs: 150 },
    );
    assert.ok(execError);
    assert.equal(execError.killed, true);
    assert.equal(execError.signal, "SIGKILL");
  });

  it("aborts promptly when the AbortSignal fires", async () => {
    const controller = new AbortController();
    const startedAt = Date.now();
    const promise = runCommandWithTimeout("sleep 30", {
      timeoutMs: 30_000,
      killGraceMs: 100,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 50);
    const { execError } = await promise;
    const elapsed = Date.now() - startedAt;
    assert.ok(execError, "expected an execError after abort");
    assert.equal(execError.killed, true);
    assert.ok(elapsed < 5000, `expected prompt abort, took ${elapsed}ms`);
  });

  it("settles immediately when the signal is already aborted", async () => {
    const { execError } = await runCommandWithTimeout("sleep 30", {
      timeoutMs: 30_000,
      killGraceMs: 100,
      signal: AbortSignal.abort(),
    });
    assert.ok(execError);
    assert.equal(execError.killed, true);
  });
});
