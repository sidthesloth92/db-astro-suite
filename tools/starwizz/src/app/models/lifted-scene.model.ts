/**
 * Everything the 3D scene needs from one photo: the photo with its stars removed, the stars
 * themselves, and a depth map of the nebula. Plain typed arrays so the whole scene can be
 * transferred from the Web Worker without copying.
 */
export interface LiftedScene {
  /** Working-image width in px. */
  width: number;
  /** Working-image height in px. */
  height: number;
  /** The photo as analysed (RGBA). Shown again when the stars return at the end of Arrive. */
  photo: Uint8ClampedArray;
  /** The photo with every lifted star filled in (RGBA). */
  starless: Uint8ClampedArray;
  /** Nebula depth per pixel, 0 (far) to 255 (near): bright structure stands out. */
  cloudDepth: Uint8Array;
  /** Atlas of star cut-outs (RGBA, star-only light). */
  atlas: Uint8ClampedArray;
  /** Atlas width in px. */
  atlasWidth: number;
  /** Atlas height in px. */
  atlasHeight: number;
  /** `PATCH_STRIDE` floats per lifted cut-out (see `star-lift.constant.ts`). */
  patches: Float32Array;
  /** `STAR_STRIDE` floats per measured star, for the Sharp star style. */
  stars: Float32Array;
  /** `GIANT_STRIDE` floats per giant star that stays anchored to the backdrop. */
  giants: Float32Array;
}
