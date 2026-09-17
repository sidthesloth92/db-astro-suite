/** Radius, in chart units, of the innermost band trail as designed. */
export const STAR_TRAILS_INNER_RADIUS = 96;

/** Designed distance between neighbouring band trails. */
export const STAR_TRAILS_RING_STEP = 34;

/**
 * Largest band-trail radius. With its 11-unit glow stroke the outermost trail
 * stays inside the 400-tall chart (centred at y 196) and clear of the legend
 * tucked over the chart's bottom edge.
 */
export const STAR_TRAILS_OUTER_RADIUS = 170;

/**
 * Smallest radius the innermost trail may move in to when many bands need
 * room — still clear of the POLARIS label beside the centre.
 */
export const STAR_TRAILS_MIN_INNER_RADIUS = 72;
