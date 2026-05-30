/**
 * Computes the catalog-search radius from the solved field dimensions.
 *
 * The radius is the half-diagonal of the field: a circle centered on the
 * solved image center whose edge reaches the image corners. This matches
 * the actual frame far better than a fixed radius — wide fields get a wide
 * search, zoomed fields get a tight one — so the catalog query returns
 * objects that are genuinely inside the picture.
 *
 * @param {number | null | undefined} widthArcmin - Solved field width (arcminutes)
 * @param {number | null | undefined} heightArcmin - Solved field height (arcminutes)
 * @param {number} [fallback=2.0] - Radius (degrees) used when dimensions are
 *   missing or invalid (e.g. solve-field stdout did not report a field size)
 * @returns {number} Search radius in degrees, clamped to [0.1, 18]
 */
export function fieldRadiusDeg(widthArcmin, heightArcmin, fallback = 2.0) {
  const w = Number(widthArcmin);
  const h = Number(heightArcmin);

  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return clampRadius(fallback);
  }

  // Half-diagonal in arcminutes → degrees.
  const halfDiagonalArcmin = Math.sqrt(w * w + h * h) / 2;
  const radiusDeg = halfDiagonalArcmin / 60;

  return clampRadius(radiusDeg);
}

/**
 * Clamps a radius to the supported range. Lower bound keeps the spatial
 * prefilter selective for very narrow fields; upper bound (18°) is just
 * over the widest index's reach so a bad solve can't request a hemisphere.
 *
 * @param {number} radiusDeg
 * @returns {number}
 */
function clampRadius(radiusDeg) {
  return Math.min(18, Math.max(0.1, radiusDeg));
}
