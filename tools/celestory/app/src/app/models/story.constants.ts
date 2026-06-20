/** Schema-version support for storys consumed by the web app. */

/**
 * The celestory.json schema version this web app can render. Must stay in
 * lockstep with the CLI's emitted `schemaVersion` (aggregate.SchemaVersion) and
 * the server's `SUPPORTED_SCHEMA_VERSION`. A dropped file with any other version
 * is treated as produced by an outdated CLI and the user is asked to regenerate.
 */
export const SUPPORTED_STORY_SCHEMA_VERSION = 2;
