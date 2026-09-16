/** External target for the "DM on Instagram" CTA in the access-key modal. */
export const INSTAGRAM_URL = 'https://instagram.com/astrowithdb';

/** Minimum access-key length before the submit button enables. */
export const MIN_ACCESS_KEY_LENGTH = 4;

/** A single decorative star in the modal backdrop (position as a percentage). */
export interface ModalStar {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly opacity: number;
}

/**
 * 48 deterministic backdrop stars, matching the design source's inline
 * generator so the modal's star field is identical to the mock.
 */
export const MODAL_STARS: readonly ModalStar[] = Array.from({ length: 48 }, (_unused, i) => ({
  cx: (i * 71) % 100,
  cy: (i * 53) % 100,
  r: i % 5 === 0 ? 1.2 : 0.6,
  opacity: Number((0.25 + (i % 4) * 0.1).toFixed(2)),
}));
