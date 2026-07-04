/** Types for the Open Graph card renderer. */

/** A plain Satori vnode (the shape `{ type, props }` Satori consumes). `props`
 * is an open bag so SVG nodes can carry raw presentation attributes (x, viewBox,
 * stroke, …) alongside `style` / `children`. */
export interface OgEl {
  type: string;
  props: Record<string, unknown>;
}

/** A labelled statistic shown in a card's bottom row. */
export interface OgStat {
  value: string;
  label: string;
  /** Optional smaller suffix rendered after the value (e.g. "h"). */
  suffix?: string;
}

/** A right-aligned label/value highlight pair. */
export interface OgHighlight {
  label: string;
  value: string;
}

/** Landing card — community headline totals. */
export interface OgLandingModel {
  hours: string;
  astronomers: string;
  frames: string;
}

/** Leaderboards card — community totals + top targets. */
export interface OgLeaderboardsModel {
  hours: string;
  astronomers: string;
  targets: string;
  frames: string;
  topTarget: string;
  mostImaged: string;
}

/** Per-profile card — headline stats + journey highlights. */
export interface OgProfileModel {
  handle: string;
  hours: string;
  targets: string;
  nights: string;
  frames: string;
  topTarget: string;
  mostImaged: string;
  longestNight: string;
}

/** Per-target card. */
export interface OgTargetModel {
  handle: string;
  /** Display name, e.g. "Andromeda Galaxy" (the pink hero). */
  name: string;
  /** Target type / category for the pill, e.g. "Galaxy". */
  type: string;
  hours: string;
  nights: string;
  frames: string;
  /** First-light month/year, e.g. "Nov 2023". */
  firstLight: string;
  /** Distinct filter count used on this target. */
  filters: string;
}

/** Per-equipment (gear) card. */
export interface OgEquipmentModel {
  handle: string;
  /** Display name, e.g. "ZWO ASI2600MM Air" (the pink hero). */
  name: string;
  /** Gear kind for the pill, e.g. "Camera" / "Telescope" / "Mount". */
  kind: string;
  hours: string;
  targets: string;
  frames: string;
  /** Target this gear was used on most, e.g. "M31". */
  mostUsedOn: string;
  /** In-service label, e.g. "Since 2022". */
  inServiceYear: string;
}
