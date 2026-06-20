/**
 * A single social-platform share link, rendered as a compact icon button in the
 * published-journey share row. Presentational data only — built from the profile
 * URL by `socialShareLinks`.
 */
export interface SocialShareLink {
  /** Stable id for `@for` tracking. */
  readonly id: string;
  /** Human-readable platform name (used for the title / aria-label). */
  readonly name: string;
  /** Single-character glyph shown inside the button. */
  readonly glyph: string;
  /** Ready-to-open share-intent URL with the profile link pre-filled. */
  readonly href: string;
}
