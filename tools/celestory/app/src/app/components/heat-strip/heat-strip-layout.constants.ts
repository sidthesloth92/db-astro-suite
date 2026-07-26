/**
 * Geometry for the nightly-activity heat strip — ported verbatim from the
 * design's HeatStrip so the timeline matches pixel-for-pixel: a baseline near
 * the bottom, every night's stem rising upward from it, and milestone pills
 * packed into two staggered tiers whose right-angle "corridor" leaders drop to
 * each milestone night's spike tip.
 */

/** Track height (px) — the design's `H`. */
export const TRACK_HEIGHT = 228;
/** Baseline centre line (px from track top) — the design's `CY`. */
export const BASELINE = 200;
/** Shortest night stem (px). */
export const STEM_MIN = 12;
/** Added stem length for the busiest night (px). */
export const STEM_RANGE = 70;
/** Floor for a milestone night's stem so its leader always has room (px). */
export const MS_STEM_MIN = 48;

/** Vertical spacing between the two milestone-pill tiers (px). */
export const TIER_H = 42;
/** Top offset of the first pill tier (px). */
export const PILL_TOP = 4;
/** Assumed pill body height — where a leader starts beneath the pill (px). */
export const PILL_BH = 30;
/** Corridor (horizontal leader run) Y for tier 0 (px). */
export const MS_CORRIDOR = 92;
/** Extra corridor drop per tier (px). */
export const MS_CORRIDOR_STEP = 12;
/** Minimum horizontal gap kept between adjacent pills on a tier (% of track). */
export const MS_GAP = 1.0;
/** Reference track width the pill half-width estimate is calibrated against (px). */
export const PILL_REF_W = 1140;

/** Leaders SVG viewBox width — x = percent × 10 maps cleanly into this space. */
export const LEADER_VBW = 1000;
/** Pixels of track per spanned month (drives the scrollable width). */
export const MONTH_PX = 66;
/** Half the hover tooltip's width (px) — used to keep it within the panel edges. */
export const TIP_HALF_W = 120;
