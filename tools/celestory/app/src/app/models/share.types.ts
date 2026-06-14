/** A selectable option in the share / story-slides flows (card with bullets). */
export interface ShareOption {
  /** Stable id used for selection + tracking. */
  id: string;
  /** Card title. */
  label: string;
  /** One-line description shown under the title. */
  description: string;
  /** Optional supporting bullets. */
  bullets?: string[];
}

/** A suggested place to share a published journey. */
export interface ShareDestination {
  /** Display name. */
  label: string;
  /** Single-letter abbreviation shown in the icon button. */
  short: string;
  /** Outbound URL (a share intent where one exists, else the site). */
  url: string;
}

/** Top-level Share Studio asset kind, selected via the drawer's intent tabs. */
export type ShareAssetKind = 'summary' | 'slides' | 'poster';

/** A share-card theme id. Each theme bundles a fixed palette + background motif. */
export type ShareThemeId =
  | 'dark'
  | 'star'
  | 'astro'
  | 'galaxy'
  | 'blackhole'
  | 'aurora'
  | 'blueprint'
  | 'atlas'
  | 'eclipse'
  | 'milkyway'
  | 'comet'
  | 'deepfield'
  | 'filmneg'
  | 'obslog'
  | 'patch'
  | 'moonlight';

/** A share-card background motif id (the motif each theme paints). */
export type ShareBackgroundId =
  | 'observatory'
  | 'starfield'
  | 'nebula'
  | 'galaxy'
  | 'blackhole'
  | 'aurora'
  | 'milkyway'
  | 'blueprint'
  | 'atlas'
  | 'eclipse'
  | 'comet'
  | 'deepfield'
  | 'patch'
  | 'moonlight'
  | 'filmneg'
  | 'obslog';

/** Picker metadata for a share-card background. */
export interface ShareBackgroundMeta {
  id: ShareBackgroundId;
  label: string;
  /** Short descriptor for the dropdown option. */
  sub: string;
}

/** A share-card social format id. */
export type ShareFormatId = 'square' | 'story' | 'landscape';

/** Share Studio mode: a single card, or the multi-slide carousel. */
export type ShareMode = 'single' | 'carousel';

/** Picker metadata for a share-card design. */
export interface ShareThemeMeta {
  id: ShareThemeId;
  label: string;
  /** CSS gradient for the swatch. */
  swatch: string;
}

/** Picker metadata for a share-card format. */
export interface ShareFormatMeta {
  id: ShareFormatId;
  label: string;
  sub: string;
  w: number;
  h: number;
}

/** One big stat on a share card. */
export interface ShareStat {
  v: string;
  k: string;
}

/** One filter bar on a share card. */
export interface ShareFilterBar {
  label: string;
  color: string;
  pct: number;
}

/** The data a share card renders. */
export interface ShareCardData {
  name: string;
  yearLabel: string;
  heroTime: string;
  stats: ShareStat[];
  filters: ShareFilterBar[];
  url: string;
}

/** The data a single-object share card renders. */
export interface ObjectShareData {
  /** Object display name (e.g. "Andromeda Galaxy"). */
  name: string;
  /** Catalogue designation (e.g. "M31"), optional. */
  designation: string;
  /** Object category/type label. */
  type: string;
  /** Object category id (selects the placeholder motif). */
  category: string;
  /** Hero integration time (e.g. "29h 36m"). */
  heroTime: string;
  /** Headline stats (frames, nights, …). */
  stats: ShareStat[];
  /** First-light → latest-session range string. */
  rangeStr: string;
  /** Per-filter bars. */
  filters: ShareFilterBar[];
  /** Equipment names used on this target. */
  equipment: string[];
  /** URL line printed on the card. */
  url: string;
}

/** The data a single-equipment share card renders. */
export interface EquipmentShareData {
  /** Gear kind label ("Camera" / "Optic"). */
  kind: string;
  /** Gear display name. */
  name: string;
  /** Spec detail line (e.g. "540mm · f/5.4"), optional. */
  detail: string;
  /** Hero integration time captured with this gear. */
  heroTime: string;
  /** Headline stats (frames, targets, …). */
  stats: ShareStat[];
  /** First-light → latest-session range string. */
  rangeStr: string;
  /** Names of the targets captured with this gear. */
  objects: string[];
  /** URL line printed on the card. */
  url: string;
}

/** One labelled row in a carousel slide list (category / gear / target). */
export interface ShareListRow {
  label: string;
  sub: string;
  valStr: string;
  value: number;
}

/** A per-filter value (with seconds) for the carousel bar chart. */
export interface ShareFilterValue {
  name: string;
  label: string;
  color: string;
  seconds: number;
}

/** One night of activity for the carousel timeline. */
export interface ShareActivityPoint {
  date: string;
  seconds: number;
}

/** A target plotted on the Sky Dome card (J2000 coordinates, decimal degrees). */
export interface ShareDomeTarget {
  label: string;
  /** Right ascension, decimal degrees. */
  ra: number;
  /** Declination, decimal degrees. */
  dec: number;
  /** Total integration on this target, in hours (drives the marker size). */
  hours: number;
  /** Object category (drives the marker accent). */
  category: string;
}

/** The data the 6-slide carousel renders. */
export interface ShareCarouselData {
  name: string;
  yearLabel: string;
  inReview: string;
  heroTime: string;
  clearNights: string;
  objectsStr: string;
  nightsStr: string;
  objectCountStr: string;
  equipmentCountStr: string;
  nightsBigStr: string;
  subObjects: string;
  subEquip: string;
  rangeStr: string;
  categories: ShareListRow[];
  equipment: ShareListRow[];
  topTargets: ShareListRow[];
  filters: ShareFilterValue[];
  activity: ShareActivityPoint[];
  /** Targets with known coordinates, for the Sky Dome card. */
  domeTargets: ShareDomeTarget[];
  url: string;
}
