/**
 * Domain models for persisted Celestory stories and their extracted child
 * rows. Kept separate from route/util files per the file-naming conventions.
 */

/** Denormalized headline totals extracted from a story on create. */
export interface StoryTotals {
  totalIntegrationSeconds: number;
  targetCount: number;
  nightCount: number;
  lightFrameCount: number;
  firstLight: string | null;
  latestSession: string | null;
}

/** One row destined for the story_targets table. */
export interface StoryTargetRow {
  targetId: string;
  designation: string;
  category: string;
  integrationSeconds: number;
  lightFrameCount: number;
  nightCount: number;
}

/** One row destined for the story_equipment table. */
export interface StoryEquipmentRow {
  /** Stable cross-user join key (the CLI's canonical equipment id). */
  equipmentId: string;
  kind: string;
  /** Equipment sub-type (mono/colour/dslr, harmonic/equatorial/tracker, …); '' when unknown. */
  subtype: string;
  displayName: string;
  normalizedKey: string;
  integrationSeconds: number;
  lightFrameCount: number;
  /** Telescope focal length in mm; null for cameras/mounts / when unknown. */
  focalLengthMm: number | null;
  /** Telescope focal ratio; null for cameras/mounts / when unknown. */
  fRatio: number | null;
}

/** One row destined for the story_filters table. */
export interface StoryFilterRow {
  name: string;
  seconds: number;
  frames: number;
}

/** One per-target, per-month rollup row destined for story_target_months. */
export interface StoryTargetMonthRow {
  targetId: string;
  designation: string;
  category: string;
  /** First day of the month, ISO `YYYY-MM-01`. */
  month: string;
  integrationSeconds: number;
  lightFrameCount: number;
}

/** One per-filter, per-month rollup row destined for story_filter_months. */
export interface StoryFilterMonthRow {
  name: string;
  /** First day of the month, ISO `YYYY-MM-01`. */
  month: string;
  seconds: number;
  frames: number;
}

/** One per-equipment, per-month rollup row destined for story_equipment_months. */
export interface StoryEquipmentMonthRow {
  equipmentId: string;
  /** First day of the month, ISO `YYYY-MM-01`. */
  month: string;
  integrationSeconds: number;
  lightFrameCount: number;
}

/** The full set of child rows derived from a story on create. */
export interface ExtractedRows {
  totals: StoryTotals;
  targets: StoryTargetRow[];
  equipment: StoryEquipmentRow[];
  filters: StoryFilterRow[];
  targetMonths: StoryTargetMonthRow[];
  filterMonths: StoryFilterMonthRow[];
  equipmentMonths: StoryEquipmentMonthRow[];
}

/** Community aggregates for the landing page, replayed from the upload log. */
export interface CommunityStats {
  /** Celestories charted: every claimed owner (latest snapshot) + every anonymous upload. */
  chartedCount: number;
  /** Online, live published profiles (the `stories` table count). */
  liveCount: number;
  totalIntegrationSeconds: number;
  targetCount: number;
  lightFrameCount: number;
}

/**
 * One anonymous upload event appended to the log on visualise/publish. Carries
 * no story contents — only the install anchor and three headline integers. The
 * profile id is never read from the client; it is assigned server-side by the
 * password-gated publish claim.
 */
export interface StoryUpload {
  installId: string;
  dataFingerprint: string;
  totalIntegrationSeconds: number;
  lightFrameCount: number;
  targetCount: number;
}
