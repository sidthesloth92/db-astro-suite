/**
 * Client-side view of the Celestory ledger — the full schema-v1 contract the
 * CLI emits and the web app consumes. Mirrors the server contract
 * (src/server/utils/ledger.types.ts) and the CLI source of truth
 * (tools/celestory/cli/internal/model/*.model.go). The current UI renders only
 * the `summary` subset; the richer arrays (objects, equipment, sessions,
 * activity) are carried for the upcoming gallery/timeline views.
 */

/** Per-filter integration within an object or a single session. */
export interface LedgerFilterIntegration {
  name: string;
  seconds: number;
  frames: number;
}

/** A filter total at the summary level (no frame count). */
export interface LedgerFilterTotal {
  name: string;
  seconds: number;
}

/** Per-category breakdown (Galaxy, Nebula, …). */
export interface LedgerCategoryStat {
  category: string;
  objectCount: number;
  integrationSeconds: number;
  lightFrameCount: number;
}

/** One night of activity across all objects (global timeline). */
export interface LedgerActivityEntry {
  date: string;
  integrationSeconds: number;
  lightFrameCount: number;
  objectIds: string[];
}

/** One per-night session for a single object (the per-object timeline node). */
export interface LedgerSession {
  date: string;
  integrationSeconds: number;
  lightFrameCount: number;
  filters: LedgerFilterIntegration[];
  equipmentIds: string[];
}

/** One imaged target with aggregated totals and per-night timeline. */
export interface LedgerObject {
  id: string;
  displayName: string;
  designation: string;
  aliases: string[];
  type: string | null;
  category: string;
  totalIntegrationSeconds: number;
  lightFrameCount: number;
  nightCount: number;
  firstLight: string;
  latestSession: string;
  /** J2000 right ascension in decimal degrees; absent when unknown. */
  ra?: number;
  /** J2000 declination in decimal degrees; absent when unknown. */
  dec?: number;
  filters: LedgerFilterIntegration[];
  equipmentIds: string[];
  sessions: LedgerSession[];
  image: string | null;
}

/** A distinct, listable piece of gear (a camera or an optic). */
export interface LedgerEquipment {
  id: string;
  kind: string;
  displayName: string;
  focalLengthMm: number | null;
  fRatio: number | null;
  totalIntegrationSeconds: number;
  lightFrameCount: number;
  objectCount: number;
  firstLight: string;
  latestSession: string;
  objectIds: string[];
}

/** Hero/summary rollup powering the hero band and filter chips. */
export interface LedgerSummary {
  totalIntegrationSeconds: number;
  objectCount: number;
  nightCount: number;
  lightFrameCount: number;
  firstLight: string;
  latestSession: string;
  duplicateFileCount: number;
  duplicateWastedBytes: number;
  filters: LedgerFilterTotal[];
  byCategory: LedgerCategoryStat[];
  activity: LedgerActivityEntry[];
}

/** Records which tool/version produced the ledger. */
export interface LedgerToolInfo {
  name: string;
  version: string;
}

/** The root ledger document the CLI emits and the web app consumes. */
export interface CelestoryLedger {
  schemaVersion: number;
  generatedAt: string;
  tool: LedgerToolInfo;
  /** Observer display name (optionally "Name — Place"); blank if unknown. */
  observer?: string;
  /** Imaging site / location line; blank if unknown. */
  site?: string;
  /** Stable per-install identity, present on CLI-produced ledgers. */
  installId?: string;
  /** Configured profile handle, when the user set one via `celestory --profile`. */
  profileId?: string;
  /** Stable hash of the normalized data, present on CLI-produced ledgers. */
  dataFingerprint?: string;
  summary: LedgerSummary;
  objects: LedgerObject[];
  equipment: LedgerEquipment[];
  duplicates?: unknown[];
  skipped?: unknown[];
}
