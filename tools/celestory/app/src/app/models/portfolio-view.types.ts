/** View-models derived from a CelestoryLedger for the portfolio hero + sections. */

/** One decorative star node in a constellation. */
export interface StarNode {
  x: number;
  y: number;
  big: boolean;
}

/** One disk on a moon-phase timeline (new → full, cyan → pink). */
export interface MoonPhase {
  cx: number;
  cy: number;
  r: number;
  color: string;
  /** new = outline only, full = filled, partial = lit path. */
  mode: 'new' | 'full' | 'partial';
  /** Lit-region path for partial phases. */
  d?: string;
}

/** Resolved identity for the hero (name, handle, place, tagline). */
export interface HeroIdentity {
  name: string;
  handle: string;
  place: string;
  tagline: string;
}

/** The first→latest year span, when both are known. */
export interface YearSpan {
  from: number;
  to: number;
}

/** One "Highlights of the journey" card. */
export interface Highlight {
  /** Stable kind for styling/tracking. */
  kind: 'top' | 'bigNight' | 'filter' | 'month';
  /** Card eyebrow. */
  key: string;
  /** Headline value. */
  value: string;
  /** Sub line (usually a duration). */
  sub: string;
  /** Optional accent colour (the filter highlight). */
  color?: string;
  /** Object id to navigate to (the top-target highlight). */
  objectId?: string;
}

/** A per-filter integration row in an object's detail. */
export interface FilterRow {
  name: string;
  label: string;
  color: string;
  seconds: number;
  frames: number;
  /** Average sub-exposure length in seconds. */
  avg: number;
  /** Share of this object's integration, 0–100. */
  pct: number;
  /** Bar width relative to the object's busiest filter, 0–1. */
  frac: number;
}

/** One imaging session, resolved for the detail timeline. */
export interface SessionView {
  date: string;
  integrationSeconds: number;
  lightFrameCount: number;
  filters: { name: string; label: string; color: string }[];
  gearNames: string[];
}

/** One proportional segment of the filter-distribution bar. */
export interface FilterSlice {
  name: string;
  label: string;
  color: string;
  seconds: number;
  pct: number;
}

/** One night dot on the activity heat strip. */
export interface HeatNight {
  date: string;
  integrationSeconds: number;
  lightFrameCount: number;
  /** Distinct objects imaged that night. */
  objectCount: number;
  /** 0–1 intensity relative to the busiest night. */
  frac: number;
  /** Horizontal position as a percentage across the span. */
  leftPct: number;
}

/** A heat-strip night with resolved vertical layout (px), for rendering. */
export interface HeatNode extends HeatNight {
  up: boolean;
  stemTop: number;
  stemHeight: number;
}

/** A month gridline label on the heat strip. */
export interface HeatMonthTick {
  leftPct: number;
  label: string;
}

/** What kind of milestone a heat-strip callout marks (drives its accent color). */
export type HeatMilestoneKind = 'hours' | 'frames' | 'object' | 'night' | 'best';

/** A milestone callout — a notable night surfaced with a dot + labelled chip. */
export interface HeatMilestone {
  /** The night this milestone falls on (ISO date). */
  date: string;
  /** Horizontal position as a percentage across the span. */
  leftPct: number;
  /** What the milestone marks. */
  kind: HeatMilestoneKind;
  /** Headline figure, e.g. "25h", "1K", "10th", "Best". */
  big: string;
  /** Caption under the headline, e.g. "LOGGED", "FRAMES", "OBJECT". */
  small: string;
}

/** A milestone with resolved chip/connector geometry (px), for rendering. */
export interface PlacedMilestone {
  id: string;
  leftPct: number;
  /** Accent color (hex), applied via the inline `--ms` custom property. */
  color: string;
  big: string;
  small: string;
  /** Edge-clamped CSS `left` for the chip so it never overflows the track. */
  chipLeft: string;
  /** Chip top edge (px from track top). */
  chipTop: number;
  /** Connector line top edge + length (px). */
  lineTop: number;
  lineHeight: number;
  /** Marker dot top edge + diameter (px). */
  dotTop: number;
  dotSize: number;
}

/** The full heat-strip view-model. */
export interface HeatStripView {
  nights: HeatNight[];
  months: HeatMonthTick[];
  /** Notable nights surfaced as labelled chips. */
  milestones: HeatMilestone[];
  /** Whole calendar months spanned (drives the scrollable track width). */
  spanMonths: number;
  caption: string;
}
