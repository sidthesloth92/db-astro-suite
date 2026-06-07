/**
 * Domain models for persisted Celestory stories and their extracted child
 * rows. Kept separate from route/util files per the file-naming conventions.
 */

/** Denormalized headline totals extracted from a ledger on create. */
export interface StoryTotals {
  totalIntegrationSeconds: number;
  objectCount: number;
  nightCount: number;
  lightFrameCount: number;
  firstLight: string | null;
  latestSession: string | null;
}

/** One row destined for the story_objects table. */
export interface StoryObjectRow {
  objectId: string;
  designation: string;
  category: string;
  integrationSeconds: number;
  lightFrameCount: number;
  nightCount: number;
}

/** One row destined for the story_equipment table. */
export interface StoryEquipmentRow {
  kind: string;
  displayName: string;
  normalizedKey: string;
  integrationSeconds: number;
}

/** One row destined for the story_filters table. */
export interface StoryFilterRow {
  name: string;
  seconds: number;
  frames: number;
}

/** The full set of child rows derived from a ledger on create. */
export interface ExtractedRows {
  totals: StoryTotals;
  objects: StoryObjectRow[];
  equipment: StoryEquipmentRow[];
  filters: StoryFilterRow[];
}

/** Community aggregates for the landing page. */
export interface CommunityStats {
  storyCount: number;
  totalIntegrationSeconds: number;
  objectCount: number;
  nightCount: number;
  lightFrameCount: number;
}
