/** Tuning + palette for the Celestory brand mark. */

/** Crescent pop-in duration (ms); the twinkle begins right after. */
export const MARK_POP_MS = 820;

/** Per-cell pop-in stagger, as a fraction of the pop-in window. */
export const MARK_POP_FRAC = 0.42;

/**
 * Logo-scoped palette — the exact colours from the canonical design
 * (Celestory Logo.html). These are deliberately distinct from the app-wide
 * brand tokens in `brand.constants.ts` (`#ff2d95` / `#00e5ff`): the logo must
 * reproduce the design pixel-for-pixel, so it keeps its own colours rather than
 * tracking the theme. Used only by the crescent mark (util + gradient).
 */

/** Pink end of the crescent's cyan↔pink scatter — design `--pink`. */
export const MARK_PINK = '#ff2a7b';

/** Cyan end of the crescent's cyan↔pink scatter — design `--cyan`. */
export const MARK_CYAN = '#19e6dd';

/** Dim lattice colour for unlit session-log cells — design unlit fill. */
export const MARK_DIM = 'rgba(170,160,200,0.16)';
