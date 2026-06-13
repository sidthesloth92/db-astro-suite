import fs from "fs/promises";
import path from "path";

/**
 * Deletes files in `dir` whose last-modified time is older than `maxAgeMs`.
 * Defence-in-depth for the temp-file lifecycle: even if a request path ever
 * fails to clean up its upload (a hung/aborted solve, a crash), nothing
 * accumulates on disk indefinitely. Never throws — per-file errors are logged
 * and skipped so one bad entry cannot abort the sweep.
 *
 * @param {{ dir: string, maxAgeMs: number, now?: number, log?: { warn?: Function, error?: Function } }} options
 * @returns {Promise<string[]>} Absolute paths of the files that were deleted.
 */
export async function sweepOrphans({ dir, maxAgeMs, now = Date.now(), log }) {
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    log?.error?.({ err, dir }, "Uploads sweep: failed to read directory");
    return [];
  }

  const deleted = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry);
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) continue;
      const ageMs = now - stats.mtimeMs;
      if (ageMs > maxAgeMs) {
        await fs.unlink(filePath);
        deleted.push(filePath);
        log?.warn?.(
          { filePath, ageMs },
          "Uploads sweep: deleted orphaned upload",
        );
      }
    } catch (err) {
      if (err.code !== "ENOENT") {
        log?.error?.({ err, filePath }, "Uploads sweep: failed to stat/unlink");
      }
    }
  }
  return deleted;
}

/**
 * Starts a periodic background sweep of the uploads directory. The interval is
 * `unref()`'d so it never keeps the process alive on its own.
 *
 * @param {{ dir: string, maxAgeMs: number, intervalMs: number, log?: object }} options
 * @returns {() => void} `stop()` — clears the interval.
 */
export function startUploadsSweeper({ dir, maxAgeMs, intervalMs, log }) {
  const interval = setInterval(() => {
    sweepOrphans({ dir, maxAgeMs, log }).catch((err) => {
      log?.error?.({ err }, "Uploads sweep failed");
    });
  }, intervalMs);
  interval.unref();

  return function stop() {
    clearInterval(interval);
  };
}
