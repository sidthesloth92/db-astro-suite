/**
 * Fraction of the stage width the compare divider moves per Arrow key press.
 */
export const COMPARE_NUDGE_STEP = 0.02;

/**
 * Lowest value the compare divider reports through `aria-valuenow`.
 */
export const COMPARE_ARIA_MIN = 0;

/**
 * Highest value the compare divider reports through `aria-valuenow`.
 */
export const COMPARE_ARIA_MAX = 100;

/**
 * Screen-reader label for the compare divider slider.
 */
export const COMPARE_ARIA_LABEL = 'Before and after comparison';

/**
 * Half the divider grip's width, in pixels. The divider's travel is inset by
 * this much at each end so the round grip is never clipped by the stage's
 * overflow-hidden frame. The stage clips the spiked canvas over the same inset
 * track, which keeps the divider line exactly on the before/after seam — the
 * grip size in `compare-handle.css` must stay in step with this value.
 */
export const COMPARE_TRACK_INSET_PX = 14;
