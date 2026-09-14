/**
 * Minimum distance, in chart units, between the centres of two band labels
 * under the System Line timeline — wide enough for a "12h 40m" duration at the
 * label's 16px size with a little air either side.
 */
export const SYSTEM_LINE_LABEL_GAP = 62;

/** Leftmost label centre, keeping a centred label inside the 476-wide chart. */
export const SYSTEM_LINE_LABEL_MIN_X = 30;

/** Rightmost label centre, keeping a centred label inside the 476-wide chart. */
export const SYSTEM_LINE_LABEL_MAX_X = 446;

/** Vertical position of the ecliptic axis every planet sits on. */
export const SYSTEM_LINE_AXIS_Y = 120;

/** Right edge of the Sun's disc at the start of the axis (centre 20, radius 13). */
export const SYSTEM_LINE_SUN_EDGE_X = 33;

/** Space kept between neighbouring planet discs, and between the first planet and the Sun. */
export const SYSTEM_LINE_PLANET_GAP = 2;

/** Smallest radius a crowded planet is shrunk to, so every band still shows a disc. */
export const SYSTEM_LINE_MIN_PLANET_RADIUS = 3.5;

/** Baseline of the hour-tick labels under the axis. */
export const SYSTEM_LINE_TICK_LABEL_Y = 140;

/** Width of one character of the 8.5px monospace hour-tick label. */
export const SYSTEM_LINE_TICK_CHAR_WIDTH = 5.1;

/** Height of the hour-tick label's glyphs above its baseline. */
export const SYSTEM_LINE_TICK_LABEL_ASCENT = 6.5;

/** Baselines of a band label's id, time and frames lines in the row under the axis. */
export const SYSTEM_LINE_LABEL_ROW_BELOW: readonly [number, number, number] = [178, 200, 217];

/**
 * Baselines of a band label's id, time and frames lines in the alternate row
 * above the axis — clear of the tick over even the largest planet (radius 37).
 */
export const SYSTEM_LINE_LABEL_ROW_ABOVE: readonly [number, number, number] = [30, 52, 69];
