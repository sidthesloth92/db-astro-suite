import {
  SEED_DOMINANCE_RADIUS_PX,
  SEED_FLUX_ANNULUS_PX,
  SEED_FLUX_RADIUS_PX,
  SEED_GROW_FRACTION,
  SEED_REGION_MAX_AREA_PX,
  SEED_REGION_MAX_ELONGATION,
} from '../constants/detection.constants';
import {
  BackgroundMap,
  DetectionOptions,
  LuminanceImage,
  SourceComponent,
  SourceMeasurement,
} from '../models/detection.types';

/**
 * Extracts the individual stars inside one oversized component.
 *
 * A component bigger than `maxArea` is a mixture — a saturated star with its
 * own halo and arms, several stars merged with the nebulosity that connects
 * them, a galaxy, or a satellite trail — so no whole-component measurement can
 * describe it. Instead, every strong local maximum (weight >=
 * `extendedMinPeak`, dominant within `SEED_DOMINANCE_RADIUS_PX`) is treated as
 * a candidate star and judged by the shape of its OWN half-weight
 * neighbourhood: the region grown from the seed through component pixels with
 * weight >= `SEED_GROW_FRACTION` of the seed's weight.
 *
 * A star grows into its round core-plus-halo. A galaxy nucleus grows into the
 * elongated central bar, and a trail seed grows into the line, so both fail
 * the `SEED_REGION_MAX_ELONGATION` gate (with `SEED_REGION_MAX_AREA_PX` as a
 * size backstop). A secondary bump — an arm knot, or a dim knot on a galaxy —
 * either reaches a strictly brighter pixel or grows into territory already
 * claimed by a stronger accepted seed, and is suppressed; seeds are processed
 * brightest-first to make that deterministic. Calibrated on a real Pleiades
 * frame (every bright star merged into nebulosity blobs is recovered), a real
 * M82 frame (the starburst core's knots all reject while genuine foreground
 * stars on the galaxy pass), and synthetic galaxy/trail scenes.
 *
 * The returned flux is the background-subtracted flux in a fixed
 * `SEED_FLUX_RADIUS_PX` disc rather than the region sum: a saturated star's
 * half-weight region can be tiny at detection scale, and ranking spikes by
 * that would starve the visually biggest stars. Disc pixels are clamped at
 * the seed's own peak and reduced by the median weight of the ring outside
 * the disc, so a bright neighbour's light never inflates a faint seed's rank.
 *
 * @param component Oversized component (area > `opts.maxArea`).
 * @param lum Detection-resolution luminance plane the component was found in.
 * @param bg Per-pixel background model matching `lum`.
 * @param opts Detection tuning parameters.
 * @returns One measurement per accepted star, in descending peak order.
 */
export function extractSeedStars(
  component: SourceComponent,
  lum: LuminanceImage,
  bg: BackgroundMap,
  opts: DetectionOptions,
): SourceMeasurement[] {
  const width = lum.width;
  const height = lum.height;
  const weightAt = (idx: number): number => Math.max(0, lum.data[idx] - bg.background[idx]);

  // Byte-plane membership stamp: components can span millions of pixels on
  // nebula-rich frames, where Set lookups would dominate the whole pass.
  const members = new Uint8Array(width * height);
  for (let i = 0; i < component.count; i++) {
    members[component.pixels[i]] = 1;
  }

  // Candidate seeds: strong pixels that no pixel in the dominance disc beats.
  // Pixels outside the component are below the detection threshold, far under
  // extendedMinPeak, so only member pixels can compete.
  const radius = SEED_DOMINANCE_RADIUS_PX;
  const candidates: { idx: number; x: number; y: number; w: number }[] = [];
  for (let i = 0; i < component.count; i++) {
    const idx = component.pixels[i];
    const w = weightAt(idx);
    if (w < opts.extendedMinPeak) {
      continue;
    }
    const x = idx % width;
    const y = (idx - x) / width;
    let isMax = true;
    for (let dy = -radius; dy <= radius && isMax; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) {
        continue;
      }
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        if (dx * dx + dy * dy > radius * radius) {
          continue;
        }
        const nx = x + dx;
        if (nx < 0 || nx >= width) {
          continue;
        }
        if (weightAt(ny * width + nx) > w) {
          isMax = false;
          break;
        }
      }
    }
    if (isMax) {
      candidates.push({ idx, x, y, w });
    }
  }
  candidates.sort((a, b) => b.w - a.w);

  // Saturated plateaus produce clusters of equal-weight maxima; keep only the
  // first of each cluster before growing anything.
  const seeds: typeof candidates = [];
  for (const candidate of candidates) {
    if (seeds.some((s) => Math.hypot(s.x - candidate.x, s.y - candidate.y) <= radius)) {
      continue;
    }
    seeds.push(candidate);
  }

  const claimed = new Set<number>();
  const accepted: SourceMeasurement[] = [];
  for (const seed of seeds) {
    const threshold = seed.w * SEED_GROW_FRACTION;
    const visited = new Set<number>([seed.idx]);
    const queue: number[] = [seed.idx];
    let containsStronger = false;
    let overlapsClaim = false;
    let regionArea = 0;
    let regionFlux = 0;
    let sumX = 0;
    let sumY = 0;
    const regionPixels: number[] = [];
    while (queue.length > 0 && regionArea <= SEED_REGION_MAX_AREA_PX) {
      const idx = queue.pop();
      if (idx === undefined) {
        break;
      }
      const w = weightAt(idx);
      if (w > seed.w) {
        containsStronger = true;
      }
      if (claimed.has(idx)) {
        overlapsClaim = true;
      }
      const x = idx % width;
      const y = (idx - x) / width;
      regionArea += 1;
      regionFlux += w;
      sumX += w * x;
      sumY += w * y;
      regionPixels.push(idx);
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) {
          continue;
        }
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const nx = x + dx;
          if (nx < 0 || nx >= width) {
            continue;
          }
          const nIdx = ny * width + nx;
          if (visited.has(nIdx) || members[nIdx] === 0 || weightAt(nIdx) < threshold) {
            continue;
          }
          visited.add(nIdx);
          queue.push(nIdx);
        }
      }
    }

    if (containsStronger || overlapsClaim || regionArea > SEED_REGION_MAX_AREA_PX || regionFlux <= 0) {
      continue;
    }

    const cx = sumX / regionFlux;
    const cy = sumY / regionFlux;
    let mxx = 0;
    let myy = 0;
    let mxy = 0;
    for (const idx of regionPixels) {
      const w = weightAt(idx);
      const x = idx % width;
      const dx = x - cx;
      const dy = (idx - x) / width - cy;
      mxx += w * dx * dx;
      myy += w * dy * dy;
      mxy += w * dx * dy;
    }
    mxx /= regionFlux;
    myy /= regionFlux;
    mxy /= regionFlux;
    const discriminant = Math.sqrt((mxx - myy) * (mxx - myy) + 4 * mxy * mxy);
    const l1 = (mxx + myy + discriminant) / 2;
    const l2 = (mxx + myy - discriminant) / 2;
    const elongation = Math.sqrt(l1 / Math.max(l2, 1e-6));
    if (elongation > SEED_REGION_MAX_ELONGATION) {
      continue;
    }

    // Fixed-disc flux for spike ranking, over the whole plane: the star's
    // light does not stop at the component boundary. Two guards keep a
    // NEIGHBOUR'S light out of the ranking — without them a faint star beside
    // a bright one inherits the neighbour's halo through the disc and earns a
    // huge spike floating next to the wrong star (glaring on low-resolution
    // frames, where such companions survive downsampling as seeds):
    // - a pixel brighter than the seed's own peak cannot be the seed's light,
    //   so its contribution is clamped at that peak;
    // - the median weight of the ring just outside the disc is subtracted as
    //   a pedestal, cancelling a smooth halo or the nebula floor. A saturated
    //   star on dark sky loses almost nothing to either guard.
    const fluxRadius = SEED_FLUX_RADIUS_PX;
    const ringRadius = fluxRadius + SEED_FLUX_ANNULUS_PX;
    // Everything is measured about the region CENTROID, not the seed pixel:
    // on a saturated star the seed is merely the first plateau pixel in scan
    // order, and a disc anchored there can hang off the plateau's edge —
    // manufacturing exactly the ring asymmetry the pedestal exists to detect.
    const centreX = Math.round(cx);
    const centreY = Math.round(cy);
    // Ring weights bucketed by quadrant: the pedestal is the spread between
    // the brightest and darkest quadrant medians — the ASYMMETRIC part of the
    // ring. An isolated star's own skirt fills the ring evenly, so its
    // quadrants agree and the pedestal stays near zero (its flux is what it
    // always was); a bright neighbour's halo fills one side only, and that
    // one-sided excess is exactly the foreign light to subtract.
    const quadrantWeights: number[][] = [[], [], [], []];
    for (let dy = -ringRadius; dy <= ringRadius; dy++) {
      const ny = centreY + dy;
      if (ny < 0 || ny >= height) {
        continue;
      }
      for (let dx = -ringRadius; dx <= ringRadius; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 <= fluxRadius * fluxRadius || d2 > ringRadius * ringRadius) {
          continue;
        }
        const nx = centreX + dx;
        if (nx < 0 || nx >= width) {
          continue;
        }
        const quadrant = (dx >= 0 ? 1 : 0) + (dy >= 0 ? 2 : 0);
        quadrantWeights[quadrant].push(weightAt(ny * width + nx));
      }
    }
    let brightestQuadrant = 0;
    let darkestQuadrant = Number.POSITIVE_INFINITY;
    for (const weights of quadrantWeights) {
      if (weights.length === 0) {
        continue;
      }
      weights.sort((a, b) => a - b);
      const median = weights[Math.floor(weights.length / 2)];
      brightestQuadrant = Math.max(brightestQuadrant, median);
      darkestQuadrant = Math.min(darkestQuadrant, median);
    }
    const pedestal =
      darkestQuadrant === Number.POSITIVE_INFINITY
        ? 0
        : Math.max(0, brightestQuadrant - darkestQuadrant);

    // Accumulate the disc as integer annuli around the seed. A star's own
    // azimuthally-averaged profile can only fall with radius, so each
    // annulus's mean is capped at the smallest mean seen so far: an isolated
    // star passes through unchanged, while annuli that RISE toward a bright
    // neighbour are trimmed to what the seed's own profile could contain.
    const annulusSum = new Float64Array(fluxRadius + 1);
    const annulusCount = new Int32Array(fluxRadius + 1);
    for (let dy = -fluxRadius; dy <= fluxRadius; dy++) {
      const ny = centreY + dy;
      if (ny < 0 || ny >= height) {
        continue;
      }
      for (let dx = -fluxRadius; dx <= fluxRadius; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > fluxRadius * fluxRadius) {
          continue;
        }
        const nx = centreX + dx;
        if (nx < 0 || nx >= width) {
          continue;
        }
        const ring = Math.round(Math.sqrt(d2));
        annulusSum[ring] += Math.max(0, Math.min(weightAt(ny * width + nx), seed.w) - pedestal);
        annulusCount[ring] += 1;
      }
    }
    let discFlux = 0;
    let profileCap = Number.POSITIVE_INFINITY;
    for (let ring = 0; ring <= fluxRadius; ring++) {
      if (annulusCount[ring] === 0) {
        continue;
      }
      const mean = Math.min(annulusSum[ring] / annulusCount[ring], profileCap);
      profileCap = mean;
      discFlux += mean * annulusCount[ring];
    }

    for (const idx of regionPixels) {
      claimed.add(idx);
    }
    accepted.push({
      cx,
      cy,
      flux: discFlux,
      peak: seed.w,
      area: regionArea,
      elongation,
      concentration: 1,
    });
  }

  return accepted;
}
