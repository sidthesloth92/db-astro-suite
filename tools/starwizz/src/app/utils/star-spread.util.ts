import {
  LIFT_HALO_FLOOR,
  LIFT_HALO_PEAK_FRACTION,
  LIFT_HALO_SIGMA,
  LIFT_NEIGHBOUR_RISE,
} from '../constants/star-lift.constant';
import { RingProfile } from '../models/ring-profile.model';
import { StarSite, StarSpread } from '../models/star-lift.model';

/**
 * Measures how far one star's own light spreads, walking outward ring by ring.
 *
 * The star ends where the darker part of its rings meets the local background, walks into a
 * neighbour, or stops falling. The last rule is what keeps a star on nebula small: there the
 * rings never reach the background level, they only level off at the brightness of the nebula,
 * and everything past that point is nebula, not star.
 *
 * @param rings - Ring reader already centred on the star
 * @param site - The star's peak above its local background, that background, and its noise
 * @param maxRadius - Farthest ring (px) to walk to
 */
export function measureStarSpread(
  rings: RingProfile,
  site: StarSite,
  maxRadius: number,
): StarSpread {
  const threshold = Math.max(
    LIFT_HALO_SIGMA * site.noise,
    LIFT_HALO_FLOOR,
    LIFT_HALO_PEAK_FRACTION * site.peak,
  );
  const centre = site.background + site.peak;

  let rEnd = maxRadius;
  let darkest = site.peak;
  for (let r = 1; r <= maxRadius; r++) {
    const level = rings.low(r);
    if (Number.isNaN(level)) {
      rEnd = r;
      break;
    }
    const excess = level - site.background;
    if (excess < threshold) {
      rEnd = r;
      break;
    }
    // Inside a burnt-out core every ring is as bright as the centre. The two rules below only
    // mean something once the light has started to fall away.
    const hasFallen = centre - level > 2 * threshold;
    if (hasFallen && excess > darkest * LIFT_NEIGHBOUR_RISE + site.noise) {
      rEnd = r - 1;
      break;
    }
    if (hasFallen && level - lowestAhead(rings, r, maxRadius) < threshold) {
      rEnd = r;
      break;
    }
    darkest = Math.min(darkest, excess);
  }
  rEnd = Math.max(1, rEnd);

  // Half-light is counted from where the star ends, so nebula under it does not widen it.
  const floor = endLevel(rings, rEnd, site.background);
  let rHalf = rEnd;
  for (let r = 1; r < rEnd; r++) {
    if (rings.low(r) - floor < 0.5 * (centre - floor)) {
      rHalf = r;
      break;
    }
  }

  return { rHalf, rEnd, roundness: roundnessOf(rings, centre, Math.min(maxRadius, 2 * rHalf + 1)) };
}

/** Darkest ring level in the stretch ahead of a radius, which grows with the radius. */
function lowestAhead(rings: RingProfile, radius: number, maxRadius: number): number {
  const last = Math.min(maxRadius, 2 * radius + 2);
  let lowest = Number.POSITIVE_INFINITY;
  for (let r = radius + 1; r <= last; r++) {
    const level = rings.low(r);
    if (!Number.isNaN(level) && level < lowest) lowest = level;
  }
  return lowest;
}

/** Ring level where the star ends, or the given background when that ring is off the image. */
function endLevel(rings: RingProfile, rEnd: number, background: number): number {
  const level = rings.low(rEnd);
  return Number.isNaN(level) ? background : level;
}

/**
 * How round a detection is, 0..1: the share of its rise above the darker part of a ring just
 * outside it that also stands above the brighter part of that ring. A star rises above its
 * surroundings in every direction and scores close to 1. A bright spot on a filament only
 * rises above the sky beside the filament, not above the filament itself, and scores low.
 * A ring that is off the image, or still as bright as the centre, says nothing about shape, so
 * the detection keeps the benefit of the doubt.
 */
function roundnessOf(rings: RingProfile, centre: number, radius: number): number {
  const low = rings.low(radius);
  const high = rings.high(radius);
  if (Number.isNaN(low) || centre - low <= 0) return 1;
  return Math.max(0, Math.min(1, (centre - high) / (centre - low)));
}
