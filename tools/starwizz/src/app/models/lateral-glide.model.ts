/**
 * Framing of the automatic backdrop glide used by the lateral travel presets
 * (Left / Right / Up / Down): the zoom held for the whole glide and how far the
 * backdrop travels before the glide loops back to its first frame.
 */
export interface LateralGlide {
  /** Zoom scale held for the whole glide (1 = image just covers the frame). */
  scale: number;
  /** Distance the backdrop moves across the frame in one loop, in on-screen px. */
  travel: number;
}
