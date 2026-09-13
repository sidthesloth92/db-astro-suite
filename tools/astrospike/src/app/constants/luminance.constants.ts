/**
 * Rec.709 luminance coefficients (Y = 0.2126 R + 0.7152 G + 0.0722 B). Shared by
 * the standalone luminance conversion and the fused downsampling path so the two
 * can never drift apart.
 */

/** Red channel weight. */
export const REC709_R = 0.2126;

/** Green channel weight. */
export const REC709_G = 0.7152;

/** Blue channel weight. */
export const REC709_B = 0.0722;
