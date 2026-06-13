/**
 * Periodically logs the solve queue's depth so a wedged queue is visible in the
 * logs instead of discovered by chance. Emits at `info` on the normal path and
 * escalates to `warn` when every concurrency slot is busy *and* work is backed
 * up behind it — the signature of stuck tasks holding their slots.
 *
 * The interval is `unref()`'d so it never keeps the process alive on its own.
 *
 * @param {{
 *   queue: { size: number, pending: number },
 *   concurrency: number,
 *   intervalMs: number,
 *   log: { info: Function, warn: Function },
 * }} options
 * @returns {() => void} `stop()` — clears the interval.
 */
export function startQueueWatchdog({ queue, concurrency, intervalMs, log }) {
  const interval = setInterval(() => {
    const { size, pending } = queue;
    const allSlotsBusy = pending >= concurrency && size > 0;
    const gauge = { queue_size: size, queue_pending: pending, concurrency };
    if (allSlotsBusy) {
      log.warn(
        gauge,
        "Solve queue: all slots busy with work backed up — possible stuck task",
      );
    } else {
      log.info(gauge, "Solve queue depth");
    }
  }, intervalMs);
  interval.unref();

  return function stop() {
    clearInterval(interval);
  };
}
