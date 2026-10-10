/**
 * Brand mark colours. These mirror the DB Astro Suite theme tokens
 * (`--db-color-neon-pink`, `--db-color-cyan`) as literal hex so they can be used
 * for canvas/SVG colour interpolation, where CSS custom properties cannot be
 * resolved (gradient lerps, `<canvas>` fills). Keep in sync with libs/theme.
 */

/** Neon pink — mirrors `--db-color-neon-pink`. */
export const BRAND_PINK = '#ff2d95';

/** Cyan — mirrors `--db-color-cyan`. */
export const BRAND_CYAN = '#00e5ff';
