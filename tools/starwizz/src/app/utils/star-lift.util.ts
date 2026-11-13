import { GIANT_STRIDE, MEASURE_MIN_AMP, STAR_STRIDE } from '../constants/star-lift.constant';
import { LiftedScene } from '../models/lifted-scene.model';
import { cloudDepthFromStarless } from './cloud-depth.util';
import { findGiantStars } from './giant-star.util';
import { inpaintHoles } from './inpaint.util';
import { isNebulaKnot } from './nebula-knot.util';
import { packStarAtlas } from './star-atlas.util';
import { brightnessOf, detectLiftStars } from './star-detect.util';
import { measureStar } from './star-measure.util';
import { buildOwnership } from './star-ownership.util';

/**
 * Turns one photo into everything the 3D scene needs: finds the stars, sets aside nebula knots
 * and giant stars (both stay with the backdrop), lifts the rest off the photo, fills the holes,
 * packs the cut-outs into an atlas, measures each star for the Sharp style, and builds the
 * nebula's depth map. Pure and synchronous, so it runs unchanged in a Web Worker or on the main
 * thread.
 *
 * @param pixels - The working-size photo, RGBA. Kept as the scene's `photo`, never modified.
 */
export function liftStars(pixels: Uint8ClampedArray, width: number, height: number): LiftedScene {
  const lum = brightnessOf(pixels, width, height);
  const stars = detectLiftStars(lum, width, height).filter(
    (star) => !isNebulaKnot(star, pixels, width, height),
  );
  const giantStars = findGiantStars(lum, pixels, width, height, stars);

  const { owner, groups } = buildOwnership(stars, width, height);
  const starless = inpaintHoles(pixels, owner, width, height);
  const { atlas, atlasWidth, atlasHeight, patches } = packStarAtlas(
    pixels,
    starless,
    owner,
    groups,
    width,
  );

  const measured: number[] = [];
  for (const star of stars) {
    const measurement = measureStar(star, pixels, width, height);
    if (measurement === null || measurement.amp < MEASURE_MIN_AMP) continue;
    // Pixel centres sit at +0.5 in the continuous coordinates the scene uses.
    measured.push(star.x + 0.5, star.y + 0.5, star.group, measurement.amp, measurement.hwhm);
    measured.push(measurement.color[0], measurement.color[1], measurement.color[2]);
  }

  const giants = new Float32Array(giantStars.length * GIANT_STRIDE);
  giantStars.forEach((giant, index) => {
    giants.set([giant.x, giant.y, giant.rCore, giant.color[0], giant.color[1], giant.color[2]], index * GIANT_STRIDE);
  });

  return {
    width,
    height,
    photo: pixels,
    starless,
    cloudDepth: cloudDepthFromStarless(starless, width, height),
    atlas,
    atlasWidth,
    atlasHeight,
    patches,
    stars: new Float32Array(measured),
    giants,
  };
}

/** Number of measured stars in a scene's `stars` table. */
export function measuredStarCount(scene: LiftedScene): number {
  return scene.stars.length / STAR_STRIDE;
}
