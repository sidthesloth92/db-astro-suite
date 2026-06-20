/**
 * Client-side view of the Celestory story — the full schema-v1 contract the
 * CLI emits and the web app consumes. Mirrors the server contract
 * (src/server/utils/story.types.ts) and the CLI source of truth
 * (tools/celestory/cli/internal/model/*.model.go). The current UI renders only
 * the `summary` subset; the richer arrays (objects, equipment, sessions,
 * activity) are carried for the upcoming gallery/timeline views.
 */

/** Per-filter integration within an object or a single session. */
export interface StoryFilterIntegration {
  name: string;
  seconds: number;
  frames: number;
}

/** A filter total at the summary level (no frame count). */
export interface StoryFilterTotal {
  name: string;
  seconds: number;
}

/** Per-category breakdown (Galaxy, Nebula, …). */
export interface StoryCategoryStat {
  category: string;
  objectCount: number;
  integrationSeconds: number;
  lightFrameCount: number;
}

/** One night of activity across all objects (global timeline). */
export interface StoryActivityEntry {
  date: string;
  integrationSeconds: number;
  lightFrameCount: number;
  objectIds: string[];
}

/** One per-night session for a single object (the per-object timeline node). */
export interface StorySession {
  date: string;
  integrationSeconds: number;
  lightFrameCount: number;
  filters: StoryFilterIntegration[];
  equipmentIds: string[];
  /** Night's representative optic spec; null/absent when unknown (added 2026-06; absent on older stories). */
  focalLengthMm?: number | null;
  /** Night's representative f-ratio; null/absent when unknown. */
  fRatio?: number | null;
}

/** One imaged target with aggregated totals and per-night timeline. */
export interface StoryObject {
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
  filters: StoryFilterIntegration[];
  equipmentIds: string[];
  sessions: StorySession[];
  image: string | null;
}

/** A distinct, listable piece of gear (a camera or an optic). */
export interface StoryEquipment {
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
export interface StorySummary {
  totalIntegrationSeconds: number;
  objectCount: number;
  nightCount: number;
  lightFrameCount: number;
  firstLight: string;
  latestSession: string;
  duplicateFileCount: number;
  duplicateWastedBytes: number;
  filters: StoryFilterTotal[];
  byCategory: StoryCategoryStat[];
  activity: StoryActivityEntry[];
}

/** Records which tool/version produced the story. */
export interface StoryToolInfo {
  name: string;
  version: string;
}

/** The root story document the CLI emits and the web app consumes. */
export interface CelestoryStory {
  schemaVersion: number;
  generatedAt: string;
  tool: StoryToolInfo;
  /** Observer display name (optionally "Name — Place"); blank if unknown. */
  observer?: string;
  /** Imaging site / location line; blank if unknown. */
  site?: string;
  /** Stable per-install identity, present on CLI-produced storys. */
  installId?: string;
  /** Configured profile handle, when the user set one via `celestory --profile`. */
  profileId?: string;
  /** Stable hash of the normalized data, present on CLI-produced storys. */
  dataFingerprint?: string;
  summary: StorySummary;
  objects: StoryObject[];
  equipment: StoryEquipment[];
  duplicates?: unknown[];
  skipped?: unknown[];
}
