/** Limits and supported versions for uploaded ledgers. */

/** The only schema version the platform currently accepts. Bump in lockstep
 * with the CLI's aggregate.SchemaVersion; older ledgers are rejected so the
 * user is prompted to regenerate with the latest CLI. */
export const SUPPORTED_SCHEMA_VERSION = 2;

/** Hard cap on object count to bound work and payload size. */
export const MAX_OBJECTS = 5000;

/** Hard cap on equipment count. */
export const MAX_EQUIPMENT = 500;
