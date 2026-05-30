/**
 * Thin wrapper around `ua-parser-js`. Exposes a single function returning a
 * narrow, stable shape — keeping the rest of the codebase decoupled from the
 * parser's evolving API and producing values that map 1:1 to `solve_events`
 * columns.
 */

import { UAParser } from "ua-parser-js";

/**
 * @typedef {Object} ParsedUserAgent
 * @property {string | null} browser_name
 * @property {string | null} browser_version
 * @property {string | null} os_name
 * @property {string | null} os_version
 * @property {string | null} device_type  e.g. "mobile" | "tablet" | "desktop"
 */

const EMPTY = Object.freeze({
  browser_name: null,
  browser_version: null,
  os_name: null,
  os_version: null,
  device_type: null,
});

/**
 * Parses a raw `User-Agent` header into a fixed shape for analytics storage.
 *
 * Unknown fields are returned as `null` (never `undefined` or `""`), so callers
 * can spread the result directly into a row object and rely on `NULL` semantics
 * for "unparseable" values. Empty / nullish input short-circuits to an all-null
 * result without invoking the parser.
 *
 * `ua-parser-js` reports phones and tablets via `device.type`, but leaves the
 * field `undefined` for desktop browsers. We normalise that to `"desktop"` so
 * the column is always populated when *any* part of the UA was understood.
 *
 * @param {string | null | undefined} uaHeader Raw `user-agent` header value.
 * @returns {ParsedUserAgent}
 */
export function parseUserAgent(uaHeader) {
  if (!uaHeader || typeof uaHeader !== "string") return { ...EMPTY };

  const { browser, os, device } = new UAParser(uaHeader).getResult();

  const browser_name = browser.name ?? null;
  const browser_version = browser.version ?? null;
  const os_name = os.name ?? null;
  const os_version = os.version ?? null;

  // device.type is left unset by the parser for desktops; infer "desktop" only
  // when the parser recognised the browser or OS, otherwise leave null so we
  // do not mislabel garbage UAs.
  let device_type = device.type ?? null;
  if (!device_type && (browser_name || os_name)) device_type = "desktop";

  return { browser_name, browser_version, os_name, os_version, device_type };
}
