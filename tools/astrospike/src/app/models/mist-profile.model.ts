/**
 * Shape of the full-image mist: how the photo's own highlights are lifted,
 * spread, and coloured before being screened back over it. A mist filter
 * scatters a share of all the light passing through it, so the Milky Way
 * core and bright nebulae glow softly, not just the stars.
 *
 * Everything is resolved on a small working copy of the image: the mist is
 * a blur several percent of the frame wide, and at that scale a few hundred
 * pixels across carries every detail it can show.
 */
export interface MistProfile {
  /**
   * Linear-light luminance below which a pixel contributes nothing. Keeps
   * the sky and the faint carpet of stars out of the mist entirely, so
   * blacks stay black.
   */
  thresholdLinear: number;
  /**
   * Exponent on the normalised excess above the threshold. Higher favours
   * the genuinely bright regions over mid-tones and softens the knee.
   */
  kneePower: number;
  /**
   * Blur radii of the mist's scales, as fractions of the working copy's
   * larger dimension. Several scales of geometrically growing radius sum
   * into the long soft tail a single Gaussian never has.
   */
  radiusScales: readonly number[];
  /** Weight of each scale in {@link radiusScales} when the scales are summed. */
  radiusWeights: readonly number[];
  /**
   * Multiplier on the mist's chroma in linear light, hue held. A blurred
   * highlight is paler than its source, and the reference look is anything
   * but pale.
   */
  saturationBoost: number;
  /** Overall gain on the mist light at full amount. */
  gain: number;
  /** Larger dimension of the working copy in pixels. */
  workMaxDimension: number;
}

/**
 * The part of the image a mist layer is drawn for, in full-resolution image
 * pixels, and the canvas rectangle it lands on. The stage passes its current
 * viewport; the export passes the whole image at scale 1.
 */
export interface MistDrawRegion {
  /** Left edge of the visible image region, in image pixels. */
  sourceX: number;
  /** Top edge of the visible image region, in image pixels. */
  sourceY: number;
  /** Width of the visible image region, in image pixels. */
  sourceWidth: number;
  /** Height of the visible image region, in image pixels. */
  sourceHeight: number;
  /** Full image width in pixels, which the layer's width maps onto. */
  imageWidth: number;
  /** Full image height in pixels, which the layer's height maps onto. */
  imageHeight: number;
  /** Width of the canvas rectangle the region is drawn into. */
  targetWidth: number;
  /** Height of the canvas rectangle the region is drawn into. */
  targetHeight: number;
}
