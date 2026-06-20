/**
 * TypeScript mirror of the schema-v1 Story JSON the Celestory CLI emits.
 * Source of truth: tools/celestory/cli/internal/model/*.model.go
 */

/** Per-filter integration within an object or session. */
export interface FilterIntegration {
  name: string;
  seconds: number;
  frames: number;
}

/** Filter total at the summary level (no frame count). */
export interface FilterTotal {
  name: string;
  seconds: number;
}

/** Per-category breakdown (Galaxy, Nebula, …). */
export interface CategoryStat {
  category: string;
  objectCount: number;
  integrationSeconds: number;
  lightFrameCount: number;
}

/** One night of activity across all objects. */
export interface ActivityEntry {
  date: string;
  integrationSeconds: number;
  lightFrameCount: number;
  objectIds: string[];
}

/** One per-night session for a single object. */
export interface Session {
  date: string;
  integrationSeconds: number;
  lightFrameCount: number;
  filters: FilterIntegration[];
  equipmentIds: string[];
  /** Night's representative telescope spec; null when unknown. */
  focalLengthMm: number | null;
  /** Night's representative f-ratio; null when unknown. */
  fRatio: number | null;
}

/** Top-level rollup powering the hero band and filter chips. */
export interface Summary {
  totalIntegrationSeconds: number;
  objectCount: number;
  nightCount: number;
  lightFrameCount: number;
  firstLight: string;
  latestSession: string;
  duplicateFileCount: number;
  duplicateWastedBytes: number;
  filters: FilterTotal[];
  byCategory: CategoryStat[];
  activity: ActivityEntry[];
}

/** A distinct piece of gear (camera, telescope, or mount) with aggregate stats. */
export interface EquipmentItem {
  id: string;
  kind: string;
  /** Equipment sub-type (mono/colour/dslr, harmonic/equatorial/tracker, refractor/sct/…); '' when unknown. */
  subtype: string;
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

/** One imaged target with aggregated totals and per-night timeline. */
export interface ObjectTimeline {
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
  filters: FilterIntegration[];
  equipmentIds: string[];
  sessions: Session[];
  image: string | null;
}

/** Records which tool/version produced the story. */
export interface ToolInfo {
  name: string;
  version: string;
}

/** The root document the CLI emits and the web app consumes. */
export interface Story {
  schemaVersion: number;
  generatedAt: string;
  tool: ToolInfo;
  /** Stable per-install identity; empty for manual/legacy storys. */
  installId: string;
  /** Stable hash of the normalized data; empty for manual/legacy storys. */
  dataFingerprint: string;
  summary: Summary;
  equipment: EquipmentItem[];
  objects: ObjectTimeline[];
  duplicates: unknown[];
  skipped: unknown[];
}
