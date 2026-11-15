// Tunables for lifting the stars off a photo. Brightness values are 0..1; sizes are in
// working-image px unless stated. All were tuned on the Christmas Tree image (the first default photo), the
// Rosette and the Pleiades at a 2560 px working size, then checked on filament nebulae (Veil,
// Crescent) and dusty fields, where a star's surroundings are far from flat.

/** Longest side (px) of the copy of the photo that is analysed and used as scene textures. */
export const LIFT_WORKING_LONG_SIDE = 2560;

// ---------- detection ----------

/** The background block is the image's short side divided by this, clamped to the range below. */
export const LIFT_BACKGROUND_BLOCK_DIVISOR = 30;
/** Smallest background block (px). */
export const LIFT_BACKGROUND_BLOCK_MIN = 32;
/** Largest background block (px). */
export const LIFT_BACKGROUND_BLOCK_MAX = 96;

/** A star must stand this many noise sigmas above its local background. */
export const LIFT_DETECT_K_SIGMA = 6;
/** ...and at least this much in absolute brightness. */
export const LIFT_DETECT_FLOOR = 0.035;
/** Largest lifted disc radius, as a fraction of the image's short side. */
export const LIFT_MAX_RADIUS_RATIO = 0.045;
/** Hard cap on lifted stars (brightest first). */
export const LIFT_MAX_STARS = 6000;
/**
 * Brightness values closer than this count as equal when looking for the flat top of a
 * burnt-out star. Far below one 8-bit step, so only rounding noise in the blur is absorbed.
 */
export const LIFT_PLATEAU_TOLERANCE = 1e-4;

/**
 * The darker part of a ring around a star is read at this share of its samples, darkest first
 * (0.5 would be the median). Low enough that nebula crossing part of the ring is not mistaken
 * for starlight.
 */
export const LIFT_RING_QUANTILE = 0.25;
/** The brighter part of a ring is read at this share of its samples, darkest first. */
export const LIFT_RING_HIGH_QUANTILE = 0.75;
/**
 * A detection less round than this (0..1) is a bright spot on a filament of nebula and stays
 * with the backdrop. Stars in clear sky measure 0.9 and up.
 */
export const LIFT_MIN_ROUNDNESS = 0.7;
/**
 * Detections whose light ends closer than this (px) are lifted without the roundness check:
 * too few pixels to judge a shape, and too small to leave a visible hole in a filament.
 */
export const LIFT_ROUNDNESS_MIN_REACH = 4;

/** A star's disc ends where its light drops below this many noise sigmas... */
export const LIFT_HALO_SIGMA = 1.2;
/** ...or this absolute brightness... */
export const LIFT_HALO_FLOOR = 0.012;
/** ...or this fraction of its own peak, whichever is highest. */
export const LIFT_HALO_PEAK_FRACTION = 0.02;
/** A ring this much brighter than the darkest ring so far means we walked into a neighbour. */
export const LIFT_NEIGHBOUR_RISE = 1.25;
/** The measured disc radius is grown by this factor... */
export const LIFT_HALO_GROW = 1.3;
/** ...plus this many px, so no rim of the star is left behind. */
export const LIFT_HALO_PAD = 2;

/** A faint detection wider than this fraction of the image width is a nebula blob, not a star... */
export const LIFT_FAT_BLOB_WIDTH_RATIO = 0.006;
/** ...and so is one this many times wider than the photo's typical star, whichever is narrower. */
export const LIFT_FAT_BLOB_STAR_WIDTHS = 2.5;
/** Floor (px) for both widths above. */
export const LIFT_FAT_BLOB_MIN_WIDTH = 4;
/** Detections brighter than this are kept however wide they are (burnt-out stars). */
export const LIFT_FAT_BLOB_PEAK = 0.75;

// ---------- nebula knots ----------

/** Below this excess over its surroundings a detection is too faint to classify by colour. */
export const KNOT_MIN_EXCESS = 0.03;
/** Below this background brightness there is no nebula to belong to. */
export const KNOT_MIN_BACKGROUND = 0.07;
/** A knot's excess light is at least this saturated... */
export const KNOT_EXCESS_SATURATION = 0.55;
/** ...sits on a background at least this saturated... */
export const KNOT_BACKGROUND_SATURATION = 0.35;
/** ...and shares its hue (cosine similarity of the two colours). */
export const KNOT_HUE_SIMILARITY = 0.86;
/** Ring samples used to read the surroundings. */
export const KNOT_RING_SAMPLES = 28;

// ---------- giant stars ----------

/** Pixels at or above this brightness belong to a burnt-out core. */
export const GIANT_CORE_BRIGHTNESS = 0.97;
/** Cores smaller than this many px are ordinary stars. */
export const GIANT_MIN_CORE_AREA = 14;
/** The glow colour is read on a ring at this multiple of the core radius. */
export const GIANT_COLOR_RING_FACTOR = 2.2;
/** A core this close (px, beyond its radius) to a lifted star is that star, not a giant. */
export const GIANT_LIFTED_GAP = 3;

// ---------- atlas ----------

/** Width (px) of the star cut-out atlas; within every WebGL2 device's texture limit. */
export const ATLAS_WIDTH = 2048;
/** Tallest atlas allowed (px); cut-outs that do not fit are dropped, faintest last. */
export const ATLAS_MAX_HEIGHT = 4096;
/** Transparent gap (px) around each cut-out so neighbours never bleed when magnified. */
export const ATLAS_PADDING = 2;

// ---------- measuring stars for the Sharp style ----------

/**
 * Total light of the profile the Sharp style draws (Moffat, beta 2.5) is this factor times
 * peak times half-width squared. Inverting it gives a half-width that conserves a star's light.
 */
export const MEASURE_PROFILE_FLUX_FACTOR = 6.55;
/** Stars brighter than this gather light over their whole disc, so their glow is not lost. */
export const MEASURE_BRIGHT_PEAK = 0.35;
/** Narrowest half-width (px) a measured star may have. */
export const MEASURE_MIN_HWHM = 0.45;
/** Stars fainter than this once measured are not redrawn. */
export const MEASURE_MIN_AMP = 0.02;
/** Rim samples used to read a star's surroundings. */
export const MEASURE_RIM_SAMPLES = 24;

// ---------- cloud depth ----------

/** Coarse blur radius for the depth map, as a fraction of the image width. */
export const CLOUD_DEPTH_COARSE_RATIO = 0.03;
/** Fine blur radius for the depth map, as a fraction of the image width. */
export const CLOUD_DEPTH_FINE_RATIO = 0.008;
/** Weight of the coarse layer; the fine layer takes the rest. */
export const CLOUD_DEPTH_COARSE_WEIGHT = 0.7;
/** Brightness percentile mapped to "far". */
export const CLOUD_DEPTH_LOW_PERCENTILE = 0.03;
/** Brightness percentile mapped to "near". */
export const CLOUD_DEPTH_HIGH_PERCENTILE = 0.985;
/** Gamma applied to the normalised depth (below 1 lifts the mid-tones forward). */
export const CLOUD_DEPTH_GAMMA = 0.8;
/** Final smoothing radius, as a fraction of the image width. */
export const CLOUD_DEPTH_SMOOTH_RATIO = 0.004;

// ---------- table layouts ----------

/** Floats per lifted cut-out: centre x, centre y, half width, half height, atlas x, y, w, h, flux. */
export const PATCH_STRIDE = 9;
/** Floats per measured star: x, y, patch index, amp, hwhm, r, g, b. */
export const STAR_STRIDE = 8;
/** Floats per giant star: x, y, core radius, r, g, b. */
export const GIANT_STRIDE = 6;
