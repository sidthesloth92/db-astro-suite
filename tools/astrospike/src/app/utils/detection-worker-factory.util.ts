/**
 * Default factory for the star detection Web Worker.
 *
 * Uses the exact `new Worker(new URL(..., import.meta.url), { type: 'module' })`
 * pattern the Angular esbuild pipeline recognizes, so the worker is bundled
 * into its own chunk. Returns `null` when Workers are unavailable or
 * construction throws — callers then fall back to main-thread detection.
 */
export function createDetectionWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }
  try {
    return new Worker(new URL('../workers/star-detection.worker', import.meta.url), {
      type: 'module',
    });
  } catch (error) {
    // Not silent: surfaced as a warning; the caller falls back to the
    // main-thread detection path with identical results.
    console.warn('Star detection worker unavailable; falling back to the main thread.', error);
    return null;
  }
}
