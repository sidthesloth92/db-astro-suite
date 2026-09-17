/**
 * Tuning constants for sampling a star's halo colour from its skirt.
 *
 * A bright star's core is blown to white on almost every stretched
 * astrophoto, so the core mean that tints its spikes reads near-white. The
 * hue survives in the skirt — the unclipped ring of light just outside the
 * core — which is where a mist filter physically scatters from. Sampling
 * there, and then pushing the result away from grey, is what turns a hot
 * star's halo blue and a giant's halo orange instead of leaving both white.
 */

/**
 * Channel value at or above which a pixel counts as clipped and is left out
 * of the skirt sample. Just under 255 because JPEG ringing and colour
 * management leave blown cores a level or two shy of full scale.
 */
export const HALO_COLOR_CLIP_LEVEL = 250;

/**
 * Share of a ring's pixels that must be clipped for the ring to count as
 * part of the blown core when the clip radius is measured outward from the
 * peak. Small, so a core that is clipped in only one channel still pushes
 * the skirt sample past it.
 */
export const HALO_COLOR_CLIP_RING_FRACTION = 0.12;

/**
 * Outer edge of the skirt annulus as a multiple of the refinement core
 * radius. Wide enough to gather a real sample on a small star, narrow enough
 * to stay on this star rather than its neighbours. The inner edge is NOT a
 * multiple of the core radius: it sits just outside the measured clip
 * radius, so a tiny unclipped star is sampled on its own wings rather than
 * on the sky beyond them.
 */
export const HALO_COLOR_ANNULUS_OUTER_RATIO = 4;

/**
 * Sky-noise sigmas a skirt pixel must rise above its local background to
 * count. The annulus of a small star is mostly sky, and sky noise is grey:
 * letting it in is what turned blue stars' halos pale. Four sigmas keeps the
 * star's wings and drops the sky, with margin for the noise estimate reading
 * low on a byte-quantised sky.
 */
export const HALO_COLOR_MIN_SIGNAL_SIGMAS = 4;

/**
 * Fewest contributing skirt pixels for the sample to be trusted. Below this
 * the mean is a handful of noise spikes, and the star's core colour — which
 * always exists — is the better guess.
 */
export const HALO_COLOR_MIN_SKIRT_PIXELS = 4;

/**
 * Smallest share of the annulus that must pass the signal gate for the
 * skirt sample to be trusted. A star's wings fill a contiguous inner band of
 * the annulus — a tenth or more of it even on a small star — while the sky
 * noise that clears the gate is a scattered percent. Below this share the
 * sample is noise, and the core colour stands in.
 */
export const HALO_COLOR_MIN_SKIRT_FRACTION = 0.05;

/**
 * Pixels the annulus keeps between itself and the measured clip radius, so
 * the partially-clipped shoulder of a blown core never leaks white into the
 * sample.
 */
export const HALO_COLOR_CLIP_MARGIN_PX = 2;

/**
 * Multiplier on the sampled skirt saturation. Real skirts are pastel — the
 * sky and the star's own white light dilute them — and the reference look is
 * anything but, so the hue is held and the chroma is doubled.
 */
export const HALO_COLOR_SATURATION_BOOST = 2.0;

/**
 * Ceiling on the boosted saturation. Fully saturated primaries composite as
 * a single channel and look painted rather than luminous, so the halo keeps
 * a little of the other two.
 */
export const HALO_COLOR_SATURATION_MAX = 0.9;

/**
 * Consecutive unclipped rings that end the outward clip scan. One clean ring
 * can be a fluke of the census on a ragged core edge; three in a row means
 * the blown region really is behind.
 */
export const HALO_COLOR_CLIP_SCAN_CLEAN_RINGS = 3;

/**
 * Smallest inner radius (px) of the skirt annulus, whatever the core radius
 * or clip radius says. Keeps the sample off the peak pixel and its immediate
 * neighbours on the tiniest stars.
 */
export const HALO_COLOR_ANNULUS_MIN_INNER_PX = 2;

/**
 * Smallest width (px) of the skirt annulus, so a star whose core and clip
 * radii nearly coincide still gathers a ring of pixels rather than a sliver.
 */
export const HALO_COLOR_ANNULUS_MIN_WIDTH_PX = 3;

/**
 * Floor on the sky-noise sigma the skirt gate is built from, in levels. A
 * black-clipped or byte-quantised sky reports a median absolute deviation
 * of zero and yet still carries one-level speckle; without the floor the
 * gate would open completely and that speckle would pass as a trusted,
 * grey skirt.
 */
export const HALO_COLOR_MIN_NOISE_SIGMA = 1;

/**
 * Inner edge of the skirt annulus as a multiple of the UNPADDED plateau
 * radius (the near-peak disc the centroid measures), so a star whose
 * plateau sits just under the clip level is sampled outside its near-white
 * top just like a clipped one is sampled outside its clip radius. The
 * plateau of a tiny star is a pixel or so, so this never pushes the annulus
 * off a small star onto the sky the way a multiple of the padded core radius
 * would.
 */
export const HALO_COLOR_ANNULUS_PLATEAU_RATIO = 1.5;
