/**
 * Half-size of the full-resolution window read around a hand-placed star, in
 * pixels. Wide enough to contain a large saturated star's core and still leave
 * a border of sky for the local background estimate, and small enough that the
 * read costs nothing even on a 60-megapixel frame.
 */
export const MANUAL_STAR_WINDOW_RADIUS_PX = 48;

/**
 * Nominal detection-scale area recorded for a hand-placed star.
 *
 * Area and elongation exist to let the detection filter reject blobs that are
 * not stars; a star the user placed by hand has already passed the only
 * judgement that matters. Nothing downstream of the filter reads either value,
 * so this is a placeholder that keeps the model uniform.
 */
export const MANUAL_STAR_AREA = 16;

/**
 * How far, in full-resolution pixels, a hand-placed star may be pulled from the
 * click that placed it.
 *
 * Measurement re-centres on the brightest thing in its window, which is what
 * makes a placed star land on the star's actual core rather than wherever the
 * pointer happened to be. On a genuinely empty patch that same search latches
 * onto noise and can drag the star tens of pixels away, past the point where
 * the user could even hover it again. Beyond this radius the measured position
 * is discarded and the click is honoured exactly: click near a star and it
 * snaps to it, click on nothing and it stays where you put it.
 */
export const MANUAL_STAR_SNAP_RADIUS_PX = 12;
