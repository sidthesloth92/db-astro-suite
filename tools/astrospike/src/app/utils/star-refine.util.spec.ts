import {
  HALO_COLOR_SATURATION_BOOST,
  HALO_COLOR_SATURATION_MAX,
} from '../constants/halo-color.constants';
import { StarColor } from '../models/detected-star.model';
import { SyntheticBackground, SyntheticStar } from '../models/synthetic-field.model';
import { boostSaturation } from './star-color-saturation.util';
import { refineStar } from './star-refine.util';
import { renderSyntheticField } from './star-field-fixture.util';

const FLAT_BACKGROUND: SyntheticBackground = { base: 10, gradientX: 0, gradientY: 0 };

/** Sky level of the hand-painted star images below. */
const SKY = 10;

/** Saturation as the halo colour pipeline defines it: 1 - min / max. */
function saturationOf(color: StarColor): number {
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  return max > 0 ? 1 - min / max : 0;
}

/** Allocates an opaque RGBA image filled with a flat grey sky. */
function flatSky(width: number, height: number, level: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = level;
    rgba[i + 1] = level;
    rgba[i + 2] = level;
    rgba[i + 3] = 255;
  }
  return rgba;
}

/**
 * Paints a radially symmetric star: every pixel whose rounded distance from
 * (cx, cy) is `d` takes `rings[d]`; pixels beyond the last ring are left as
 * they are. Real bright stars have a blown core and a long skirt that a
 * Gaussian fixture cannot reproduce (its tail is gone before the annulus
 * starts), so the skirt tests paint their profiles explicitly.
 */
function paintRings(
  rgba: Uint8ClampedArray,
  width: number,
  cx: number,
  cy: number,
  rings: readonly StarColor[],
): void {
  const maxRing = rings.length - 1;
  for (let y = cy - maxRing; y <= cy + maxRing; y++) {
    for (let x = cx - maxRing; x <= cx + maxRing; x++) {
      const d = Math.round(Math.hypot(x - cx, y - cy));
      if (d > maxRing) {
        continue;
      }
      const i = (y * width + x) * 4;
      rgba[i] = rings[d].r;
      rgba[i + 1] = rings[d].g;
      rgba[i + 2] = rings[d].b;
      rgba[i + 3] = 255;
    }
  }
}

/** Sky plus `intensity` scaled per channel by the tint, clamped to bytes. */
function tinted(intensity: number, tint: StarColor): StarColor {
  const channel = (t: number): number => Math.min(255, Math.round(SKY + (intensity * t) / 255));
  return { r: channel(tint.r), g: channel(tint.g), b: channel(tint.b) };
}

const WHITE: StarColor = { r: 255, g: 255, b: 255 };

/**
 * Ring profile of a bright star: `coreRings` fully clipped white rings, then
 * a skirt in `tint` whose intensity decays as a power law out to
 * `skirtRadius` — the long, coloured tail a real stretched star wears.
 */
function blownStarRings(coreRings: number, skirtRadius: number, tint: StarColor): StarColor[] {
  const rings: StarColor[] = [];
  for (let d = 0; d <= skirtRadius; d++) {
    if (d < coreRings) {
      rings.push(WHITE);
    } else {
      rings.push(tinted(200 * Math.pow(coreRings / d, 1.2), tint));
    }
  }
  return rings;
}

describe('refineStar', () => {
  it('should refine a synthetic star centroid to within 0.2 px with a positive peak', () => {
    const width = 64;
    const height = 64;
    const stars: SyntheticStar[] = [{ x: 31.6, y: 32.3, amplitude: 200, sigma: 2 }];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 31, 32, 8);

    expect(Math.abs(refined.x - 31.6)).toBeLessThan(0.2);
    expect(Math.abs(refined.y - 32.3)).toBeLessThan(0.2);
    expect(refined.peak).toBeGreaterThan(0);
  });

  it('should recover the injected tint hue after max-channel normalization', () => {
    const width = 64;
    const height = 64;
    const stars: SyntheticStar[] = [
      { x: 32, y: 32, amplitude: 200, sigma: 2, color: { r: 255, g: 128, b: 0 } },
    ];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 32, 32, 8);

    // Red is the dominant injected channel, so it normalizes to exactly 255.
    expect(refined.color.r).toBe(255);
    expect(refined.color.g).toBeLessThan(refined.color.r);
    expect(refined.color.b).toBeLessThan(refined.color.g);
    expect(refined.color.b).toBeLessThan(50);
  });

  it('should return a sensible color for a star with a saturated core', () => {
    const width = 64;
    const height = 64;
    const stars: SyntheticStar[] = [
      { x: 32, y: 32, amplitude: 900, sigma: 2.5, color: { r: 255, g: 180, b: 120 } },
    ];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 32, 32, 10);

    // The saturated core is excluded; the unsaturated ring keeps the tint.
    expect(refined.color.r).toBe(255);
    expect(refined.color.g).toBeGreaterThan(refined.color.b);
    expect(refined.color.g).toBeLessThan(255);
    for (const channel of [refined.color.r, refined.color.g, refined.color.b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
    expect(Math.abs(refined.x - 32)).toBeLessThan(0.5);
    expect(Math.abs(refined.y - 32)).toBeLessThan(0.5);
  });

  it('should stay centred on the core when the star drags an asymmetric bright arm', () => {
    // Regression for the misalignment reported on real telescope data: stars
    // already carry their own diffraction arms in the source image, and the
    // arms are rarely symmetric. A whole-window centroid gets dragged along
    // the brighter arm; the peak-anchored core centroid must not.
    const width = 160;
    const height = 120;
    const starX = 80;
    const starY = 60;
    const rgba = new Uint8ClampedArray(width * height * 4);
    const put = (x: number, y: number, v: number): void => {
      const i = (y * width + x) * 4;
      const clamped = Math.min(255, rgba[i] + v);
      rgba[i] = clamped;
      rgba[i + 1] = clamped;
      rgba[i + 2] = clamped;
      rgba[i + 3] = 255;
    };
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        put(x, y, 10); // flat sky
      }
    }
    // Bright star: the core saturates (as real bright stars do — the core
    // always clips before its arms), leaving a flat 255 plateau.
    for (let y = starY - 12; y <= starY + 12; y++) {
      for (let x = starX - 12; x <= starX + 12; x++) {
        const d2 = (x - starX) ** 2 + (y - starY) ** 2;
        put(x, y, Math.round(1200 * Math.exp(-d2 / (2 * 2.5 * 2.5))));
      }
    }
    // One long bright arm to the right, a stubby dim one to the left.
    for (let t = 3; t < 60; t++) {
      put(starX + t, starY, Math.round(160 * (1 - t / 60) ** 2));
    }
    for (let t = 3; t < 15; t++) {
      put(starX - t, starY, Math.round(50 * (1 - t / 15) ** 2));
    }

    const refined = refineStar(rgba, width, height, starX + 1.5, starY - 1, 40);

    expect(Math.abs(refined.x - starX)).toBeLessThan(1);
    expect(Math.abs(refined.y - starY)).toBeLessThan(1);
  });

  it('should not let a brighter neighbour in the window capture the anchor', () => {
    const width = 200;
    const height = 100;
    const rgba = new Uint8ClampedArray(width * height * 4);
    const put = (x: number, y: number, v: number): void => {
      const i = (y * width + x) * 4;
      const clamped = Math.min(255, rgba[i] + v);
      rgba[i] = clamped;
      rgba[i + 1] = clamped;
      rgba[i + 2] = clamped;
      rgba[i + 3] = 255;
    };
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        put(x, y, 10);
      }
    }
    const gauss = (cx: number, cy: number, amp: number, sigma: number): void => {
      const r = Math.ceil(sigma * 5);
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          const d2 = (x - cx) ** 2 + (y - cy) ** 2;
          put(x, y, Math.round(amp * Math.exp(-d2 / (2 * sigma * sigma))));
        }
      }
    };
    gauss(80, 50, 120, 2.2); // the star being refined
    gauss(115, 50, 240, 2.6); // much brighter neighbour inside the window

    const refined = refineStar(rgba, width, height, 81, 49, 40);

    expect(Math.abs(refined.x - 80)).toBeLessThan(1.5);
    expect(Math.abs(refined.y - 50)).toBeLessThan(1.5);
  });

  it('should keep the core tight when a lone bright pixel sits elsewhere in the window', () => {
    const width = 160;
    const height = 100;
    const rgba = new Uint8ClampedArray(width * height * 4);
    const put = (x: number, y: number, v: number): void => {
      const i = (y * width + x) * 4;
      const clamped = Math.min(255, rgba[i] + v);
      rgba[i] = clamped;
      rgba[i + 1] = clamped;
      rgba[i + 2] = clamped;
      rgba[i + 3] = 255;
    };
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        put(x, y, 10);
      }
    }
    for (let y = 44; y <= 56; y++) {
      for (let x = 74; x <= 86; x++) {
        const d2 = (x - 80) ** 2 + (y - 50) ** 2;
        put(x, y, Math.round(150 * Math.exp(-d2 / (2 * 2 * 2))));
      }
    }
    // A hot pixel of comparable brightness 30 px away. With a distance-based
    // plateau this widened the core to include it and dragged the centroid.
    put(110, 50, 150);

    const refined = refineStar(rgba, width, height, 80, 50, 35);

    expect(Math.abs(refined.x - 80)).toBeLessThan(1);
    expect(Math.abs(refined.y - 50)).toBeLessThan(1);
  });

  it('should clamp the window at the image edges without crashing', () => {
    const width = 40;
    const height = 40;
    const stars: SyntheticStar[] = [{ x: 2.2, y: 1.8, amplitude: 150, sigma: 1.5 }];
    const rgba = renderSyntheticField(width, height, stars, FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, 2, 2, 8);

    expect(Number.isFinite(refined.x)).toBeTrue();
    expect(Number.isFinite(refined.y)).toBeTrue();
    expect(Math.abs(refined.x - 2.2)).toBeLessThan(1);
    expect(Math.abs(refined.y - 1.8)).toBeLessThan(1);
    expect(refined.peak).toBeGreaterThan(0);
  });

  it('should fall back to the approximate position when the window is empty', () => {
    const width = 16;
    const height = 16;
    const rgba = renderSyntheticField(width, height, [], FLAT_BACKGROUND, 0, 7);

    const refined = refineStar(rgba, width, height, -50, -50, 4);

    expect(refined.x).toBe(-50);
    expect(refined.y).toBe(-50);
    expect(refined.peak).toBe(0);
    expect(refined.color).toEqual({ r: 255, g: 255, b: 255 });
    expect(refined.haloColor).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe('refineStar halo colour', () => {
  const BLUE_TINT: StarColor = { r: 110, g: 150, b: 255 };
  const ORANGE_TINT: StarColor = { r: 255, g: 140, b: 60 };

  it('should give a blown white star a saturated blue halo sampled from its skirt', () => {
    const width = 120;
    const height = 120;
    const rgba = flatSky(width, height, SKY);
    paintRings(rgba, width, 60, 60, blownStarRings(4, 44, BLUE_TINT));

    const refined = refineStar(rgba, width, height, 60, 60, 45);

    // The core colour is what it always was: the clipped disc reads white.
    expect(refined.color.r).toBeGreaterThanOrEqual(250);
    expect(refined.color.g).toBeGreaterThanOrEqual(250);
    expect(refined.color.b).toBeGreaterThanOrEqual(250);
    // The halo is the skirt's blue, pushed well past the skirt's own pastel.
    expect(refined.haloColor.b).toBe(255);
    expect(refined.haloColor.r).toBeLessThan(140);
    expect(refined.haloColor.g).toBeLessThan(175);
    expect(refined.haloColor.r).toBeLessThan(refined.haloColor.g);
    expect(saturationOf(refined.haloColor)).toBeGreaterThan(saturationOf(BLUE_TINT));
  });

  it('should give a blown white star an orange halo with blue held well under green', () => {
    const width = 120;
    const height = 120;
    const rgba = flatSky(width, height, SKY);
    paintRings(rgba, width, 60, 60, blownStarRings(4, 44, ORANGE_TINT));

    const refined = refineStar(rgba, width, height, 60, 60, 45);

    expect(refined.haloColor.r).toBe(255);
    expect(refined.haloColor.g).toBeLessThan(255);
    expect(refined.haloColor.b).toBeLessThan(refined.haloColor.g - 40);
    expect(saturationOf(refined.haloColor)).toBeGreaterThan(saturationOf(ORANGE_TINT));
  });

  it('should keep the blown core and its white shoulder out of the halo sample', () => {
    // A star clipped in blue out to ring 6, wearing a near-white unclipped
    // shoulder at ring 7 (JPEG ringing does this), then a dim blue skirt.
    // The luma plateau is a single pixel, so the core disc alone would start
    // the annulus at 6 px and take the shoulder in; the clip radius must push
    // it past ring 7.
    const width = 80;
    const height = 80;
    const skirt: StarColor = { r: 20, g: 25, b: 60 };
    const shoulder: StarColor = { r: 225, g: 225, b: 225 };
    const paint = (core: StarColor): Uint8ClampedArray => {
      const rgba = flatSky(width, height, SKY);
      const rings: StarColor[] = [WHITE];
      for (let d = 1; d <= 6; d++) {
        rings.push(core);
      }
      rings.push(shoulder);
      for (let d = 8; d <= 30; d++) {
        rings.push(skirt);
      }
      paintRings(rgba, width, 40, 40, rings);
      return rgba;
    };

    const clipped = refineStar(paint({ r: 60, g: 60, b: 255 }), width, height, 40, 40, 34);

    // Every skirt pixel is identical, so a sample that took nothing but the
    // skirt is exactly the sky-subtracted skirt colour, normalised and
    // boosted. One shoulder pixel leaking in would pull red and green up.
    const skirtAboveSky = { r: skirt.r - SKY, g: skirt.g - SKY, b: skirt.b - SKY };
    const scale = 255 / Math.max(skirtAboveSky.r, skirtAboveSky.g, skirtAboveSky.b);
    const expected = boostSaturation(
      { r: skirtAboveSky.r * scale, g: skirtAboveSky.g * scale, b: skirtAboveSky.b * scale },
      HALO_COLOR_SATURATION_BOOST,
      HALO_COLOR_SATURATION_MAX,
    );
    expect(clipped.haloColor).toEqual(expected);
    expect(clipped.haloColor.b).toBe(255);
    expect(clipped.haloColor.r).toBeLessThan(100);
    expect(clipped.haloColor.g).toBeLessThan(100);
  });

  it('should fall back to the boosted core colour when nothing beyond the core rises above the sky', () => {
    // A tinted two-pixel star on a perfectly flat sky: the annulus starts at
    // 2 px and finds only sky there, so the skirt has no pixels and the core
    // colour must stand in — boosted, so the faint star still glows in its
    // own hue.
    const width = 40;
    const height = 40;
    const rgba = flatSky(width, height, SKY);
    const tint: StarColor = { r: 240, g: 130, b: 30 };
    paintRings(rgba, width, 20, 20, [WHITE, tint]);

    const refined = refineStar(rgba, width, height, 20, 20, 12);

    expect(refined.haloColor).toEqual(
      boostSaturation(refined.color, HALO_COLOR_SATURATION_BOOST, HALO_COLOR_SATURATION_MAX),
    );
    expect(refined.haloColor.r).toBe(255);
    expect(refined.haloColor.g).toBeGreaterThan(0);
    expect(refined.haloColor.b).toBeLessThan(refined.haloColor.g);
  });

  it('should keep a tight star its own hue instead of sampling the sky noise around it', () => {
    // A tight orange star on a noisy bright sky. Its light is gone by 2 px,
    // so everything in the annulus is sky noise — grey, and positive half the
    // time. Ungated, that noise would average to a white halo; gated at
    // HALO_COLOR_MIN_SIGNAL_SIGMAS sigmas it is dropped and the halo keeps the
    // star's orange.
    const width = 48;
    const height = 48;
    const brightSky: SyntheticBackground = { base: 120, gradientX: 0, gradientY: 0 };
    const stars: SyntheticStar[] = [
      { x: 24, y: 24, amplitude: 120, sigma: 0.6, color: { r: 255, g: 128, b: 0 } },
    ];
    const rgba = renderSyntheticField(width, height, stars, brightSky, 6, 7);

    const refined = refineStar(rgba, width, height, 24, 24, 12);

    expect(refined.haloColor.r).toBe(255);
    expect(refined.haloColor.g).toBeLessThan(200);
    expect(refined.haloColor.b).toBeLessThan(120);
    expect(refined.haloColor.b).toBeLessThan(refined.haloColor.g);
  });

  it('should distrust a skirt that is a scattered patch rather than a band around the star', () => {
    // A tight orange star on a flat sky, plus a stray bright grey patch out in
    // the annulus (a hot-pixel cluster, a neighbour's wing). Nine pixels clear
    // the signal gate but cover well under HALO_COLOR_MIN_SKIRT_FRACTION of
    // the annulus, so the sample is untrusted and the core colour stands in.
    // Grow the patch past that share and it is taken for a real skirt.
    const width = 48;
    const height = 48;
    const tint: StarColor = { r: 240, g: 130, b: 30 };
    const paintWithPatch = (patchSize: number): Uint8ClampedArray => {
      const rgba = flatSky(width, height, SKY);
      paintRings(rgba, width, 24, 24, [WHITE, tint]);
      for (let y = 30; y < 30 + patchSize; y++) {
        for (let x = 30; x < 30 + patchSize; x++) {
          const i = (y * width + x) * 4;
          rgba[i] = 200;
          rgba[i + 1] = 200;
          rgba[i + 2] = 200;
        }
      }
      return rgba;
    };

    const scattered = refineStar(paintWithPatch(3), width, height, 24, 24, 12);
    expect(scattered.haloColor).toEqual(
      boostSaturation(scattered.color, HALO_COLOR_SATURATION_BOOST, HALO_COLOR_SATURATION_MAX),
    );
    expect(scattered.haloColor.r).toBe(255);
    expect(scattered.haloColor.b).toBeLessThan(scattered.haloColor.g);

    const band = refineStar(paintWithPatch(9), width, height, 24, 24, 12);
    expect(band.haloColor.r).toBe(band.haloColor.g);
    expect(band.haloColor.g).toBe(band.haloColor.b);
  });

  it('should fall back to white when every pixel in the window is clipped', () => {
    const width = 40;
    const height = 40;
    const rgba = flatSky(width, height, 255);

    const refined = refineStar(rgba, width, height, 20, 20, 12);

    expect(refined.color).toEqual({ r: 255, g: 255, b: 255 });
    expect(refined.haloColor).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('should leave a plain grey sky with no star white rather than black', () => {
    const width = 40;
    const height = 40;
    const rgba = flatSky(width, height, SKY);

    const refined = refineStar(rgba, width, height, 20, 20, 12);

    expect(refined.peak).toBe(0);
    expect(refined.haloColor).toEqual({ r: 255, g: 255, b: 255 });
  });
});
