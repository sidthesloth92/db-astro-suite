/** A star found in the photo, with how far its light spreads. Coordinates are working-image px. */
export interface LiftStar {
  /** Column of the star's brightest pixel. */
  x: number;
  /** Row of the star's brightest pixel. */
  y: number;
  /** Peak brightness above the local background, 0..1. */
  peak: number;
  /** Radius (px) at which the star's light has fallen to half its peak. */
  rHalf: number;
  /** Radius (px) of the disc lifted off the photo: where the star's light meets the background. */
  rHalo: number;
}

/** Where a star was found and what surrounds it there. Brightness values are 0..1. */
export interface StarSite {
  /** Peak brightness above the local background. */
  peak: number;
  /** Local background brightness. */
  background: number;
  /** Local noise (standard deviation). */
  noise: number;
}

/** How far one star's own light spreads, measured ring by ring. */
export interface StarSpread {
  /** Radius (px) at which the star's light has fallen to half its height. */
  rHalf: number;
  /** Radius (px) at which the star's light ends. */
  rEnd: number;
  /** 0..1: how evenly the detection stands above its surroundings in every direction. */
  roundness: number;
}

/**
 * One lifted cut-out: a star, plus any fainter stars whose centres fall inside its disc and so
 * travel with it. Bounds are inclusive working-image px.
 */
export interface StarGroup {
  /** Left edge of the cut-out. */
  x0: number;
  /** Top edge of the cut-out. */
  y0: number;
  /** Right edge of the cut-out. */
  x1: number;
  /** Bottom edge of the cut-out. */
  y1: number;
}

/** Per-pixel local background level and noise of a brightness image. */
export interface LocalBackground {
  /** Background brightness per pixel, 0..1. */
  background: Float32Array;
  /** Noise (robust standard deviation) per pixel, 0..1. */
  sigma: Float32Array;
}

/** Which patch owns each pixel, and the patches themselves. */
export interface StarOwnership {
  /** Patch index per pixel, or -1 where the photo's backdrop shows through. */
  owner: Int32Array;
  /** The lifted cut-outs, indexed by patch index. */
  groups: StarGroup[];
  /** Patch index of each input star, in the order the stars were given. */
  groupOf: Int32Array;
}

/** One level of the hole-filling pyramid: a half-size copy of the level below. */
export interface PyramidLevel {
  /** Interleaved RGB colour, 0..255, three values per pixel. */
  color: Float32Array;
  /** How much of each pixel is known, 0 (hole) to 1 (known). */
  valid: Float32Array;
  /** Level width in px. */
  width: number;
  /** Level height in px. */
  height: number;
}

/** A very bright star whose glow is too wide to lift; it stays with the backdrop. */
export interface GiantStar {
  /** Centre column, working-image px. */
  x: number;
  /** Centre row, working-image px. */
  y: number;
  /** Radius (px) of the burnt-out core. */
  rCore: number;
  /** Colour of the glow just outside the core, brightest channel = 1. */
  color: [number, number, number];
}

/** What a star looks like once measured for redrawing: brightness, width and colour. */
export interface StarMeasurement {
  /** Peak brightness above the surroundings, 0..1. */
  amp: number;
  /** Half width at half maximum, in working-image px. */
  hwhm: number;
  /** Star colour, brightest channel = 1. */
  color: [number, number, number];
}

/** The packed atlas of lifted cut-outs and the table describing them. */
export interface StarAtlas {
  /** RGBA pixels: each patch's star-only light (photo minus starless). */
  atlas: Uint8ClampedArray;
  /** Atlas width in px. */
  atlasWidth: number;
  /** Atlas height in px. */
  atlasHeight: number;
  /** `PATCH_STRIDE` floats per patch: centre x/y, half width/height, atlas x/y/width/height, flux. */
  patches: Float32Array;
}
