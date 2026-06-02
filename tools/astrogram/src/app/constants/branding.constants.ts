/**
 * Astrogram-wide branding strings used by the shared HeaderComponent.
 * Kept in one place so the wordmark, tagline, logo, and external links
 * don't drift between layouts (desktop / mobile shell).
 */

/** Wordmark rendered in the header brand cluster. */
export const ASTROGRAM_TITLE = 'astrogram';

/** Trailing portion of the wordmark rendered in the accent colour (white "astro" + pink "gram"). */
export const ASTROGRAM_TITLE_ACCENT = 'gram';

/** Tagline rendered next to the wordmark on desktop. */
export const ASTROGRAM_TAGLINE = 'Professional Exposure Cards';

/** Logo image path served from astrogram's public/assets. */
export const ASTROGRAM_LOGO_SRC = 'assets/img/astrogram.png';

/** External link to the source repository. */
export const ASTROGRAM_GITHUB_HREF = 'https://github.com/sidthesloth92/db-astro-suite';

/** External link to the author's personal site (rendered as "About me"). */
export const ASTROGRAM_ABOUT_HREF = 'https://dineshbalajiv.com';

/** Link target for the header brand (logo + title) — returns to the hub's Astrogram tool page. */
export const ASTROGRAM_BRAND_HREF = '/tool/astrogram';
