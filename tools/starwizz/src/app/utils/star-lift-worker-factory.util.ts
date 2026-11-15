/**
 * Default factory for the star-lift Web Worker.
 *
 * Uses the exact `new Worker(new URL(..., import.meta.url), { type: 'module' })` pattern the
 * Angular esbuild pipeline recognises, so the worker is bundled into its own chunk. Returns
 * `null` when Workers are unavailable or construction throws; callers then lift on the main
 * thread with identical results.
 */
export function createStarLiftWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }
  try {
    return new Worker(new URL('../workers/star-lift.worker', import.meta.url), { type: 'module' });
  } catch (error) {
    // Not silent: surfaced as a warning; the caller falls back to the main thread.
    console.warn('Star-lift worker unavailable; falling back to the main thread.', error);
    return null;
  }
}
