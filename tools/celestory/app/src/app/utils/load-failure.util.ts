import type { LoadFailure } from '../models/load-failure.types';

/**
 * HTTP status carried by a failed request, or null. Read structurally: in the
 * browser Angular raises an HttpErrorResponse (`status`), but during SSR
 * Analog routes requests through its own fetch and raises a FetchError
 * (`status` / `statusCode`), so an `instanceof` check would miss it.
 */
function statusOf(error: unknown): number | null {
  if (error === null || typeof error !== 'object') {
    return null;
  }
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  if (typeof status === 'number') {
    return status;
  }
  return typeof statusCode === 'number' ? statusCode : null;
}

/**
 * Classify a failed profile request. Only an HTTP 404 means the profile
 * doesn't exist; anything else (database down, 5xx, timeout, offline) is
 * "unavailable" — a temporary state that must never be shown, or indexed, as
 * "not found".
 */
export function loadFailure(error: unknown): LoadFailure {
  return statusOf(error) === 404 ? 'not-found' : 'unavailable';
}
