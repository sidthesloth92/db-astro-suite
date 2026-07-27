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
 *
 * @param component Component pixels (flat indices) at detection resolution.
 * @param lum Detection-resolution luminance plane the component was found in.
 * @param bg Per-pixel background model matching `lum`.
 * @returns Centroid, flux, peak, area, and elongation of the source.
 */
export function measureSource(
  component: SourceComponent,
  lum: LuminanceImage,
  bg: BackgroundMap,
): SourceMeasurement {
  const width = lum.width;

  let flux = 0;
  let peak = 0;
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
    }
    mxx /= flux;
    myy /= flux;
    mxy /= flux;
  }

  const discriminant = Math.sqrt((mxx - myy) * (mxx - myy) + 4 * mxy * mxy);
  const l1 = (mxx + myy + discriminant) / 2;
  const l2 = (mxx + myy - discriminant) / 2;
  const elongation = Math.sqrt(l1 / Math.max(l2, 1e-6));

  return { cx, cy, flux, peak, area: component.count, elongation };
}
