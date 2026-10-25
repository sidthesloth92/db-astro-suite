/**
 * The copy of an uploaded story that gets stored and served publicly. The full
 * story is kept as the CLI wrote it (forward-compatible fields, sky
 * coordinates, backfill source) except fields that must never be public:
 * - `installId`, `dataFingerprint`, `profileId` — per-install identity, used
 *   only by the upload bookkeeping at publish time (read from the request).
 * - `duplicates`, `skipped` — hold local file paths. The CLI already writes
 *   them empty; cleared again here in case an older CLI or a hand-edited file
 *   includes them.
 */

/** Return the story without its private fields; non-objects pass through unchanged. */
export function toStoredStory(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw;
  }
  // The identity fields are destructured out and intentionally discarded.
  const {
    installId: _installId,
    dataFingerprint: _dataFingerprint,
    profileId: _profileId,
    ...publicFields
  } = raw as Record<string, unknown>;
  return { ...publicFields, duplicates: [], skipped: [] };
}

/**
 * Keep a profile's saved name across a re-upload. The CLI never writes an
 * `observer` line (the name is set on the website), so an incoming story
 * without one inherits the stored line; an incoming non-empty one wins.
 */
export function withStoredObserver(incoming: unknown, storedObserver: string | null): unknown {
  if (incoming === null || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return incoming;
  }
  const story = incoming as Record<string, unknown>;
  const current = typeof story['observer'] === 'string' ? story['observer'].trim() : '';
  return current || !storedObserver ? story : { ...story, observer: storedObserver };
}
