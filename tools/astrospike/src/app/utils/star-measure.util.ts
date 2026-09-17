import {
  CONCENTRATION_PLATEAU_FRACTION,
  CONCENTRATION_RADIUS_SCALE,
} from '../constants/detection.constants';
import {
  BackgroundMap,
  LuminanceImage,
  SourceComponent,
  SourceMeasurement,
} from '../models/detection.types';

/**
 * Measures photometry and shape of one connected component. Per-pixel weights
 * are `max(0, lum - background)`; `flux` is their sum, `peak` their maximum,
 * and `cx`/`cy` the flux-weighted centroid (falling back to the unweighted
 * pixel centroid when every weight is zero, to avoid NaN). Elongation is
 * `sqrt(l1 / max(l2, 1e-6))` where l1 >= l2 are the eigenvalues of the
 * flux-weighted second central moment matrix — 1 means perfectly round.
 * Concentration is the fraction of the flux lying within
 * `concentrationRadius` of the peak pixel — high for point sources (even ones
 * dragging their own diffraction arms), low for galaxies and trails.
 *
 * @param component Component pixels (flat indices) at detection resolution.
 * @param lum Detection-resolution luminance plane the component was found in.
 * @param bg Per-pixel background model matching `lum`.
 * @param concentrationRadius Floor radius (px) of the concentration disc; the
 *   effective disc grows with the source's near-peak core size.
 * @returns Centroid, flux, peak, area, elongation, and concentration.
 */
export function measureSource(
  component: SourceComponent,
  lum: LuminanceImage,
  bg: BackgroundMap,
  concentrationRadius: number,
): SourceMeasurement {
  const width = lum.width;

  let flux = 0;
  let peak = 0;
  let peakX = 0;
  let peakY = 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < component.count; i++) {
    const idx = component.pixels[i];
    const w = Math.max(0, lum.data[idx] - bg.background[idx]);
    const x = idx % width;
    const y = (idx - x) / width;
    flux += w;
    sumX += w * x;
    sumY += w * y;
    if (w > peak) {
      peak = w;
      peakX = x;
      peakY = y;
    }
  }

  let cx: number;
  let cy: number;
  if (flux > 0) {
    cx = sumX / flux;
    cy = sumY / flux;
  } else {
    // Every weight clamped to zero: use the unweighted pixel centroid so the
    // measurement stays finite instead of dividing by zero.
    let ux = 0;
    let uy = 0;
    for (let i = 0; i < component.count; i++) {
      const idx = component.pixels[i];
      const x = idx % width;
      ux += x;
      uy += (idx - x) / width;
    }
    const n = Math.max(1, component.count);
    cx = ux / n;
    cy = uy / n;
  }

  let mxx = 0;
  let myy = 0;
  let mxy = 0;
  let corePixelCount = 0;
  const coreWeightThreshold = peak * CONCENTRATION_PLATEAU_FRACTION;
  if (flux > 0) {
    for (let i = 0; i < component.count; i++) {
      const idx = component.pixels[i];
      const w = Math.max(0, lum.data[idx] - bg.background[idx]);
      const x = idx % width;
      const dx = x - cx;
      const dy = (idx - x) / width - cy;
      mxx += w * dx * dx;
      myy += w * dy * dy;
      mxy += w * dx * dy;
      if (w >= coreWeightThreshold) {
        corePixelCount++;
      }
    }
    mxx /= flux;
    myy /= flux;
    mxy /= flux;
  }

  const discriminant = Math.sqrt((mxx - myy) * (mxx - myy) + 4 * mxy * mxy);
  const l1 = (mxx + myy + discriminant) / 2;
  const l2 = (mxx + myy - discriminant) / 2;
  const elongation = Math.sqrt(l1 / Math.max(l2, 1e-6));

  let concentration = 1;
  if (flux > 0) {
    // The disc adapts to the near-peak core so a heavily saturated plateau is
    // not penalised for its sheer size. It grows with the core's
    // area-equivalent radius — derived from the pixel COUNT, never from pixel
    // distances, so bright pixels scattered along a trail cannot inflate it.
    const coreEquivalentRadius = Math.sqrt(corePixelCount / Math.PI);
    const effectiveRadius = Math.max(
      concentrationRadius,
      CONCENTRATION_RADIUS_SCALE * coreEquivalentRadius,
    );
    const radiusSq = effectiveRadius * effectiveRadius;
    let nearFlux = 0;
    for (let i = 0; i < component.count; i++) {
      const idx = component.pixels[i];
      const x = idx % width;
      const dx = x - peakX;
      const dy = (idx - x) / width - peakY;
      if (dx * dx + dy * dy <= radiusSq) {
        nearFlux += Math.max(0, lum.data[idx] - bg.background[idx]);
      }
    }
    concentration = nearFlux / flux;
  }

  return { cx, cy, flux, peak, area: component.count, elongation, concentration };
}
