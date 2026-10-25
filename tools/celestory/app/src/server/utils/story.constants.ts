/** Limits and supported versions for uploaded storys. */

/** The only schema version the platform currently accepts. Bump in lockstep
 * with the CLI's aggregate.SchemaVersion; older storys are rejected so the
 * user is prompted to regenerate with the latest CLI. */
export const SUPPORTED_SCHEMA_VERSION = 3;

/** Hard cap on target count to bound work and payload size. */
export const MAX_TARGETS = 5000;

/** Hard cap on equipment count. */
export const MAX_EQUIPMENT = 500;

/** Largest story accepted for publish/update (bytes of JSON). ~6,000 imaging
 * sessions at ~510 B each; well under Vercel's 4.5 MB request-body ceiling. */
export const MAX_STORY_BYTES = 3 * 1024 * 1024;

/** Max length of an id (target id, gear id, and id references). */
export const MAX_ID_LENGTH = 120;

/** Max length of a name-like field (target/gear names, designation, aliases,
 * category, type, kind, subtype). The CLI takes these from FITS header values,
 * which are at most 68 characters. */
export const MAX_NAME_LENGTH = 120;

/** Max length of a filter name. */
export const MAX_FILTER_NAME_LENGTH = 60;

/** Max length of the free-text observer and site lines. */
export const MAX_OBSERVER_LENGTH = 120;

/** Max aliases kept per target. */
export const MAX_ALIASES = 50;

/** Max length of the producing tool's name and version. */
export const MAX_TOOL_FIELD_LENGTH = 40;

/** Max length of a date/timestamp string (ISO dates are 10–30 chars). */
export const MAX_DATE_LENGTH = 40;

/** Max length of a target's `image` reference (reserved for photo uploads; a URL fits). */
export const MAX_IMAGE_REF_LENGTH = 2048;
