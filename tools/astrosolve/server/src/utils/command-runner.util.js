import { spawn } from "child_process";

/**
 * Default grace period (ms) between the initial SIGTERM and the follow-up
 * SIGKILL when terminating a runaway process group.
 */
const DEFAULT_KILL_GRACE_MS = 5_000;

/**
 * Extra slack (ms) after the SIGKILL grace expires before the promise is
 * force-settled even if the child's `close` event never arrives. This is the
 * "no matter what" guarantee: the returned promise always resolves.
 */
const FORCE_SETTLE_SLACK_MS = 2_000;

/**
 * Signal-killed exit info synthesised onto the execError so callers can read
 * the same `.code` / `.signal` / `.killed` fields that `child_process.exec`
 * surfaces, without coupling to the underlying spawn implementation.
 *
 * @typedef {Error & { code: number | null, signal: string | null, killed: boolean, stdout: string, stderr: string, cmd: string }} CommandExecError
 */

/**
 * Builds an exec-compatible error object so downstream diagnostics code can
 * keep reading `execError.code` / `.signal` / `.killed` unchanged.
 *
 * @param {string} message
 * @param {{ code: number | null, signal: string | null, killed: boolean, stdout: string, stderr: string, cmd: string }} fields
 * @returns {CommandExecError}
 */
function buildExecError(message, fields) {
  const err = new Error(message);
  err.code = fields.code;
  err.signal = fields.signal;
  err.killed = fields.killed;
  err.stdout = fields.stdout;
  err.stderr = fields.stderr;
  err.cmd = fields.cmd;
  return err;
}

/**
 * Runs a shell command with a hard wall-clock timeout, killing the **entire
 * child process group** (not just the direct child) when the timeout or an
 * abort signal fires.
 *
 * This is the fix for the queue-slot leak: `child_process.exec`'s timeout only
 * SIGTERMs the immediate `/bin/sh` child, leaving long-running grandchildren
 * (e.g. astrometry's `astrometry-engine`) orphaned and holding the inherited
 * stdout pipe open — so `exec` never emits `close` and its promise never
 * settles, permanently occupying a p-queue slot. Here the child is spawned
 * `detached` (its own process group), and on timeout/abort we signal the
 * negative PID to take down the whole tree with SIGKILL, guaranteeing the pipe
 * closes and the promise settles.
 *
 * Never rejects — solver-level failures are reported via the returned
 * `execError`, mirroring the original `exec`-based contract so the caller's
 * success/failure branches are unchanged.
 *
 * @param {string} command - Shell command line to execute via `/bin/sh -c`.
 * @param {{
 *   timeoutMs: number,
 *   signal?: AbortSignal,
 *   killGraceMs?: number,
 *   log?: { warn?: Function },
 * }} options
 * @returns {Promise<{ stdout: string, stderr: string, durationMs: number, execError: CommandExecError | null }>}
 */
export function runCommandWithTimeout(command, options) {
  const { timeoutMs, signal, log } = options;
  const killGraceMs = options.killGraceMs ?? DEFAULT_KILL_GRACE_MS;

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn("/bin/sh", ["-c", command], { detached: true });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let aborted = false;
    let spawnError = null;
    let killSignal = null;

    let killTimer = null;
    let graceTimer = null;
    let forceTimer = null;

    const clearTimers = () => {
      for (const t of [killTimer, graceTimer, forceTimer]) {
        if (t) clearTimeout(t);
      }
    };

    /**
     * Signals the whole process group (negative PID). Falls back to signalling
     * the direct child if the group send fails (e.g. the leader already exited).
     */
    const killGroup = (sig) => {
      killSignal = sig;
      try {
        process.kill(-child.pid, sig);
      } catch {
        try {
          child.kill(sig);
        } catch {
          // Process already gone — nothing to kill.
        }
      }
    };

    const settle = (closeCode, closeSignal) => {
      if (settled) return;
      settled = true;
      clearTimers();
      if (signal) signal.removeEventListener("abort", onAbort);

      let execError = null;
      if (spawnError) {
        spawnError.stdout = stdout;
        spawnError.stderr = stderr;
        execError = spawnError;
      } else if (timedOut || aborted) {
        execError = buildExecError(
          timedOut
            ? `Command timed out after ${timeoutMs} ms and was killed`
            : "Command aborted before completion",
          {
            code: null,
            signal: killSignal ?? closeSignal ?? "SIGKILL",
            killed: true,
            stdout,
            stderr,
            cmd: command,
          },
        );
      } else if (closeCode != null && closeCode !== 0) {
        execError = buildExecError(`Command failed with exit code ${closeCode}`, {
          code: closeCode,
          signal: closeSignal,
          killed: false,
          stdout,
          stderr,
          cmd: command,
        });
      } else if (closeSignal != null) {
        // Process was killed by an external signal (e.g. OOM killer, container
        // runtime SIGKILL). Neither timedOut nor aborted are set, so this branch
        // catches the remaining case and preserves accurate diagnostics.
        execError = buildExecError(`Command killed by external signal ${closeSignal}`, {
          code: null,
          signal: closeSignal,
          killed: true,
          stdout,
          stderr,
          cmd: command,
        });
      }

      resolve({ stdout, stderr, durationMs: Date.now() - startedAt, execError });
    };

    /** Escalation: SIGTERM, then SIGKILL the group after the grace period. */
    const beginTermination = () => {
      killGroup("SIGTERM");
      graceTimer = setTimeout(() => killGroup("SIGKILL"), killGraceMs);
      // Absolute backstop: if `close` never fires even after SIGKILL (extremely
      // unlikely), resolve anyway so the promise — and the queue slot — frees.
      forceTimer = setTimeout(() => {
        if (!settled) {
          log?.warn?.(
            { cmd: command },
            "Command did not emit 'close' after SIGKILL; force-settling",
          );
          settle(null, killSignal);
        }
      }, killGraceMs + FORCE_SETTLE_SLACK_MS);
    };

    function onAbort() {
      if (settled || aborted || timedOut) return;
      aborted = true;
      beginTermination();
    }

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      spawnError = err;
      settle(null, null);
    });
    child.on("close", (code, sig) => settle(code, sig));

    killTimer = setTimeout(() => {
      timedOut = true;
      beginTermination();
    }, timeoutMs);

    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort);
    }
  });
}
