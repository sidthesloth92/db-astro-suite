/**
 * Tuning constants for how a star's measured brightness maps onto the geometry
 * of its diffraction spikes.
 *
 * The mapping is logarithmic (linear in stellar magnitude), not a power law on
 * raw flux. Real frames bury a power law: saturated bright stars integrate to
 * flux hundreds of times the median star's (a real M82 frame measured 8300:1
 * across 582 stars), so a power law renders everything past the top handful at
 * sub-pixel size and the Stars slider appears to do nothing. Physically, a
 * spike's VISIBLE length ends where its falloff meets the sky, which grows
 * with the logarithm of the star's flux — so the log model is also the one
 * that looks like a telescope.
 */

/**
 * Spike-scale loss per factor-of-two of flux below the reference star. Chosen
 * visually on a real M82 frame (582 stars) and a dense 82-megapixel nebula
 * field: smaller values flatten toward an artificial uniform crosshatch,
 * larger ones sink mid-list stars into invisibility again.
 */
export const SPIKE_MAGNITUDE_SLOPE = 0.2;

/**
 * Minimum relative spike scale for any rendered star. Everything the user
 * chooses to spike must be visibly spiked — the brightness ordering still
 * shows in every star above the floor.
 */
export const SPIKE_SCALE_FLOOR = 0.15;

/**
 * Rank (1-based) of the star whose flux anchors the scale. Anchoring on the
 * single brightest source lets one monster star — or a bright galaxy core —
 * drag every other star toward the floor; the 4th-brightest is robust to a
 * few such outliers while staying independent of how many stars the field
 * has (a count-based quantile would flatten star-rich fields).
 */
export const FLUX_REF_RANK = 4;

/**
 * Minimum share of the preset's peak alpha given to the faintest spiked star,
 * so its spikes stay visible without competing with the brightest stars.
 */
export const SPIKE_ALPHA_FLOOR = 0.15;

/** Narrowest renderable spike arm, in pixels. */
export const SPIKE_THICKNESS_MIN_PX = 1.5;

/** Widest spike arm, in pixels — keeps bright stars from turning into bars. */
export const SPIKE_THICKNESS_MAX_PX = 16;

/**
 * Minimum flux (as a fraction of the reference flux) granted to a star the
 * user manually forced on. Under the magnitude model this yields a spike
 * scale of roughly a third — clearly visible, clearly not dominant. Without
 * it, clicking a very faint star "adds spikes" at the bare floor scale, which
 * can read as the click doing nothing.
 */
export const FORCED_FLUX_FLOOR_RATIO = 0.1;

/**
 * Alpha of a fully diffused star's bloom before user brightness scaling.
 * Carried over from the tuned bloom that shipped as its own preset, so full
 * diffusion still reproduces the diffusion-filter look it was chosen for.
 */
export const DIFFUSION_BLOOM_INTENSITY = 0.85;

/**
 * Exponent applied to the diffusion amount when sizing the bloom.
 *
 * Alpha scales linearly with the slider, which is what reads as "how much".
 * Radius scaling linearly too would make low settings a faint pinprick nobody
 * would notice, so radius rises faster than the setting does and the bloom
 * arrives at a legible size as soon as it arrives at all.
 */
export const DIFFUSION_RADIUS_EXPONENT = 0.5;

/**
 * Colour the far end of an arm is pushed toward at full chroma.
 *
 * Diffraction bends longer wavelengths further, so each colour forms its own
 * spike of its own length and the red one reaches furthest. The outer arm is
 * therefore the reddest part of a real spike.
 */
export const CHROMA_TIP_TINT = { r: 255, g: 96, b: 40 } as const;

/**
 * Colour the root of an arm is pushed toward at full chroma — the other end of
 * the same physics, where the shorter wavelengths pile up.
 */
export const CHROMA_ROOT_TINT = { r: 120, g: 170, b: 255 } as const;

/**
 * How much of the chroma amount reaches the root, relative to the tip.
 *
 * Kept well below 1 because near the star every wavelength still overlaps, so
 * the core of a real spike stays close to the star's own colour while the tail
 * separates. Tinting both ends equally reads as a gradient someone applied
 * rather than light coming apart.
 */
export const CHROMA_ROOT_STRENGTH = 0.45;

/**
 * Fraction of the arm sprite's length over which the colour reaches the tip
 * tint, after which it holds.
 *
 * The sprite's alpha falls as (1 - x)^gamma, so the outer third of it is far
 * too faint to see: a gradient spread across the whole sprite puts its red end
 * in the invisible tail and the visible arm never leaves its root colour.
 * Compressing the ramp into the part that actually shows is what makes the
 * separation visible at all.
 */
export const CHROMA_GRADIENT_SPAN = 0.45;
