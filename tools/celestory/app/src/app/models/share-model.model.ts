/**
 * The rich `model` every Celestory share card renders from — a render-ready
 * projection of the ledger plus the editable viewer identity. Mirrors the
 * shape the design source (`Celestory/js/share-card.jsx`) consumes so the
 * canvas renderer can be a faithful, pixel-accurate port.
 */

/** Canonical share-card filter keys (emission + broadband + one-shot colour). */
export type ShareFilterKey = 'Ha' | 'SII' | 'OIII' | 'L' | 'R' | 'G' | 'B' | 'RGB';

/** Seconds of integration per filter key (absent keys mean none collected). */
export type ShareFilterDistribution = Partial<Record<ShareFilterKey, number>>;

/** One night of global activity across all targets. */
export interface ShareActivityNight {
  /** ISO date (YYYY-MM-DD…). */
  date: string;
  /** Seconds of integration captured that night. */
  integrationSeconds: number;
}

/** Per-category rollup keyed by category name (Galaxy, Nebula, …). */
export interface ShareCategoryStat {
  /** Number of targets in this category. */
  count: number;
  /** Seconds of integration across the category. */
  seconds: number;
}

/** Summary rollup powering the hero band, stat rows and filter charts. */
export interface ShareSummary {
  /** Total integration across the whole journey, in seconds. */
  totalIntegrationSeconds: number;
  /** Distinct imaged targets. */
  uniqueObjects: number;
  /** Distinct nights imaged. */
  nightsImaged: number;
  /** Total light frames captured. */
  totalLightFrames: number;
  /** Seconds per filter key. */
  filterDistribution: ShareFilterDistribution;
  /** First-light date. */
  firstLight: string;
  /** Latest-session date. */
  latestSession: string;
  /** Nightly activity, ascending by date. */
  activity: ShareActivityNight[];
  /** Per-category rollup keyed by category name. */
  byCategory: Record<string, ShareCategoryStat>;
}

/** One per-night session node for a single object. */
export interface ShareModelSession {
  /** ISO date. */
  date: string;
  /** Seconds of integration that session. */
  integrationSeconds: number;
  /** Light frames that session. */
  lightFrames: number;
  /** Gear ids used that session. */
  equipmentIds: string[];
}

/** One imaged target in the share model. */
export interface ShareModelObject {
  /** Stable id. */
  id: string;
  /** Display name (e.g. "Andromeda Galaxy"). */
  displayName: string;
  /** Catalogue designation (e.g. "M31"); blank when unknown. */
  designation: string;
  /** Object type label; null when unknown. */
  type: string | null;
  /** Object category id (selects motifs / colours). */
  category: string;
  /** Total integration on this target, in seconds. */
  totalIntegrationSeconds: number;
  /** Total light frames on this target. */
  totalLightFrames: number;
  /** First-light date. */
  firstLight: string;
  /** Latest-session date. */
  latestSession: string;
  /** Seconds per filter key for this target. */
  filterTotals: ShareFilterDistribution;
  /** Per-night sessions. */
  sessions: ShareModelSession[];
}

/** One piece of gear in the share model. */
export interface ShareModelEquipment {
  /** Stable id. */
  id: string;
  /** Gear kind ("Camera" / optic kind). */
  kind: string;
  /** Display name. */
  displayName: string;
  /** Spec detail line (e.g. "540mm · f/5.4"); blank when unknown. */
  detail: string;
  /** Total integration captured with this gear, in seconds. */
  totalIntegrationSeconds: number;
  /** Total light frames captured with this gear. */
  totalLightFrames: number;
  /** Distinct targets captured with this gear. */
  objectCount: number;
  /** First-light date. */
  firstLight: string;
  /** Latest-session date. */
  latestSession: string;
  /** Target ids captured with this gear. */
  objectIds: string[];
}

/** Editable viewer identity printed on the cards. */
export interface ShareIdentity {
  /** Display name (e.g. "Vera C"). */
  name: string;
  /** Public handle (without the leading "@"). */
  handle: string;
}

/** The complete model every Celestory share card renders from. */
export interface ShareModel {
  /** Observer line ("Name — Place"); blank when unknown. */
  observer: string;
  /** Editable viewer identity (display name + handle). */
  identity: ShareIdentity;
  /** Summary rollup. */
  summary: ShareSummary;
  /** Imaged targets. */
  objects: ShareModelObject[];
  /** Gear used. */
  equipment: ShareModelEquipment[];
}
