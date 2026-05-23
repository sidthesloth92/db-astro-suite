/**
 * Utility helpers for the analytics `diagnostics` JSON blob.
 *
 * The point of this module is to keep one knob (`MAX_DIAG_FIELD_BYTES`)
 * for capping the size of free-text diagnostic fields (stdout/stderr
 * tails, HTTP response bodies) before they land in `solve_events`.
 */

/**
 * Maximum bytes of any single text diagnostic field before truncation.
 * Tuned so that a fully-populated `solve_events.diagnostics` row stays
 * well under SQLite's default page size budget while still capturing
 * enough error context to debug 3rd-party failures from the row alone.
 */
export const MAX_DIAG_FIELD_BYTES = 8000;

/**
 * Returns the last `maxBytes` bytes of `value`, prefixed with a marker
 * line when truncation happens. The tail is usually where solver and
 * TAP error output is most informative, so we keep the end.
 *
 * Accepts non-string values defensively (objects, undefined). Returns
 * `null` for `null`/`undefined` so callers can pass-through directly.
 *
 * @param {string | null | undefined} value
 * @param {number} [maxBytes=MAX_DIAG_FIELD_BYTES]
 * @returns {string | null}
 */
export function tail(value, maxBytes = MAX_DIAG_FIELD_BYTES) {
  if (value == null) return null;
  const str = typeof value === "string" ? value : String(value);
  if (str.length <= maxBytes) return str;
  const truncatedBytes = str.length - maxBytes;
  return `[…truncated ${truncatedBytes} bytes, showing last ${maxBytes}]\n${str.slice(-maxBytes)}`;
}
