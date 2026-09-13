import { DEFAULT_HALO_PROFILE, SPIKE_PRESETS } from '../constants/spike-presets.constants';
import { DEFAULT_STAR_ADJUSTMENT } from '../constants/star-adjustment.constants';
import { DetectedStar } from '../models/detected-star.model';
import { HaloProfile, SpikePreset } from '../models/spike-preset.model';
import { SpikeRenderParams, SpriteCache } from '../models/spike-render-params.model';
import { computeHaloGeometry } from './spike-brightness.util';
import { renderSpikes } from './spike-render.util';

const CANVAS_SIZE = 100;
const CENTER = 50;
const SAMPLE_RADIUS = 15;

/**
 * The tuned halo profile with its radius opened up for the 100 px test
 * canvas: haloRadiusPx = 100 * 0.3 * h * sqrt(amount), so the reference star
 * at full amount spans 30 px and its hot core 2.4 px — measurable pixel by
 * pixel, where the real 8 px would be a smudge.
 */
const WIDE_HALO_PROFILE: HaloProfile = { ...DEFAULT_HALO_PROFILE, haloRadiusScale: 0.3 };

/** Builds a fully populated test preset with selective overrides. */
function makePreset(overrides: Partial<SpikePreset> = {}): SpikePreset {
  return {
    id: 'classic',
    label: 'Test',
    description: 'Test preset',
    spikeCount: 4,
    // lengthPx = 100 * 0.4 = 40, thicknessPx = 4, glowRadiusPx = 8.
    lengthScale: 0.4,
    intensityScale: 1,
    thicknessRatio: 0.1,
    falloffGamma: 1,
    glowRadiusRatio: 2,
    glowIntensity: 0.5,
    rotationOffsetDeg: 45,
    haloProfile: DEFAULT_HALO_PROFILE,
    ...overrides,
  };
}

/** Builds a white star at the canvas center with selective overrides. */
function makeStar(overrides: Partial<DetectedStar> = {}): DetectedStar {
  return {
    id: 0,
    x: CENTER,
    y: CENTER,
    flux: 100,
    peak: 1,
    area: 5,
    elongation: 1,
    color: { r: 255, g: 255, b: 255 },
    haloColor: { r: 255, g: 255, b: 255 },
    ...overrides,
  };
}

/** Builds render params for a single centered star with selective overrides. */
function makeParams(overrides: Partial<SpikeRenderParams> = {}): SpikeRenderParams {
  return {
    stars: [makeStar()],
    fluxRef: 100,
    forcedStarIds: new Set<number>(),
    adjustments: new Map(),
    offsetX: 0,
    offsetY: 0,
    preset: makePreset(),
    spikeCount: 4,
    lengthFactor: 1,
    intensityFactor: 1,
    rotationDeg: 0,
    glowFactor: 0,
    mistFactor: 0,
    chromaFactor: 0,
    imageMaxDimension: CANVAS_SIZE,
    scale: 1,
    ...overrides,
  };
}

/** Creates a square canvas context filled opaque with the given CSS colour. */
function makeContext(fill: string): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('2D context unavailable in test');
  }
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  return ctx;
}

/** Creates a square canvas context filled opaque black. */
function makeBlackContext(): CanvasRenderingContext2D {
  return makeContext('black');
}

/** Reads the RGB channels of the pixel at (x, y). */
function channelsAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): { r: number; g: number; b: number } {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2] };
}

/** Sums the RGB channels of the pixel at (x, y). */
function brightnessAt(ctx: CanvasRenderingContext2D, x: number, y: number): number {
  const c = channelsAt(ctx, x, y);
  return c.r + c.g + c.b;
}

/** Samples brightness at `radius` px from the canvas center along `angleDeg`. */
function brightnessAtAngle(
  ctx: CanvasRenderingContext2D,
  angleDeg: number,
  radius: number,
): number {
  const rad = (angleDeg * Math.PI) / 180;
  const x = Math.round(CENTER + Math.cos(rad) * radius);
  const y = Math.round(CENTER + Math.sin(rad) * radius);
  return brightnessAt(ctx, x, y);
}

/** Furthest lit pixel along the +x axis, where the 45-degree arms never reach. */
function reachAlongAxis(ctx: CanvasRenderingContext2D): number {
  let reach = 0;
  for (let r = 1; r < CENTER; r++) {
    if (brightnessAtAngle(ctx, 0, r) > 0) {
      reach = r;
    }
  }
  return reach;
}

/** Asserts every pixel of the canvas is black. */
function expectAllBlack(ctx: CanvasRenderingContext2D): void {
  const image = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
  for (let i = 0; i < image.length; i += 4) {
    expect(image[i] + image[i + 1] + image[i + 2]).toBe(0);
  }
}

describe('renderSpikes', () => {
  it('should draw four arms at the preset offset brighter than off-arm directions', () => {
    const ctx = makeBlackContext();
    renderSpikes(ctx, makeParams(), new Map());

    const armAngles = [45, 135, 225, 315];
    const offAngles = [0, 90, 180, 270];
    const onArm = armAngles.map((a) => brightnessAtAngle(ctx, a, SAMPLE_RADIUS));
    const offArm = offAngles.map((a) => brightnessAtAngle(ctx, a, SAMPLE_RADIUS));

    const dimmestArm = Math.min(...onArm);
    const brightestOff = Math.max(...offArm);
    expect(dimmestArm).toBeGreaterThan(0);
    expect(dimmestArm).toBeGreaterThan(brightestOff + 50);
  });

  it('should rotate the spike pattern by rotationDeg', () => {
    const ctx = makeBlackContext();
    renderSpikes(ctx, makeParams({ rotationDeg: 45 }), new Map());

    // Offset 45 + rotation 45 puts the arms on the axes.
    expect(brightnessAtAngle(ctx, 0, SAMPLE_RADIUS)).toBeGreaterThan(
      brightnessAtAngle(ctx, 45, SAMPLE_RADIUS) + 50,
    );
  });

  it('should draw six arms when spikeCount is 6', () => {
    const ctx = makeBlackContext();
    renderSpikes(ctx, makeParams({ spikeCount: 6 }), new Map());

    const armAngles = [45, 105, 165, 225, 285, 345];
    const betweenAngles = [75, 135, 195, 255, 315, 15];
    const dimmestArm = Math.min(...armAngles.map((a) => brightnessAtAngle(ctx, a, SAMPLE_RADIUS)));
    const brightestGap = Math.max(
      ...betweenAngles.map((a) => brightnessAtAngle(ctx, a, SAMPLE_RADIUS)),
    );
    expect(dimmestArm).toBeGreaterThan(brightestGap + 50);
  });

  it('should draw a central glow around the star', () => {
    const ctx = makeBlackContext();
    renderSpikes(ctx, makeParams(), new Map());
    // (55, 50) is inside the 8 px glow but well off the diagonal arms.
    expect(brightnessAt(ctx, 55, 50)).toBeGreaterThan(0);
  });

  it('should accumulate brightness additively when the same star is rendered twice', () => {
    const ctx = makeBlackContext();
    const cache: SpriteCache = new Map();
    const params = makeParams();

    renderSpikes(ctx, params, cache);
    const nearRootOnce = brightnessAtAngle(ctx, 45, SAMPLE_RADIUS);
    // 80% along the 40 px arm, where a single pass is far from saturation.
    const farOnce = brightnessAtAngle(ctx, 45, 32);

    renderSpikes(ctx, params, cache);
    const nearRootTwice = brightnessAtAngle(ctx, 45, SAMPLE_RADIUS);
    const farTwice = brightnessAtAngle(ctx, 45, 32);

    expect(nearRootTwice).toBeGreaterThanOrEqual(nearRootOnce);
    expect(farOnce).toBeGreaterThan(0);
    expect(farTwice).toBeGreaterThan(farOnce * 1.5);
  });

  it('should restore alpha, composite operation, and transform after rendering', () => {
    const ctx = makeBlackContext();
    ctx.globalAlpha = 0.42;
    ctx.globalCompositeOperation = 'multiply';
    ctx.setTransform(2, 0, 0, 2, 3, 4);

    // A raised amount drives both the screen and the lighter paths, so the
    // restore is exercised after the operation has been switched twice.
    renderSpikes(ctx, makeParams({ glowFactor: 1 }), new Map());

    expect(ctx.globalAlpha).toBeCloseTo(0.42, 5);
    expect(ctx.globalCompositeOperation).toBe('multiply');
    const t = ctx.getTransform();
    expect([t.a, t.b, t.c, t.d, t.e, t.f]).toEqual([2, 0, 0, 2, 3, 4]);
  });

  it('should leave the canvas and cache untouched for an empty star list', () => {
    const ctx = makeBlackContext();
    const cache: SpriteCache = new Map();
    renderSpikes(ctx, makeParams({ stars: [] }), cache);

    expect(cache.size).toBe(0);
    expectAllBlack(ctx);
  });

  it('should build sprites once and reuse them from the cache across renders', () => {
    const ctx = makeBlackContext();
    const cache: SpriteCache = new Map();
    const params = makeParams({
      stars: [makeStar(), makeStar({ id: 1, x: 30, y: 30, flux: 50 })],
    });

    renderSpikes(ctx, params, cache);
    // Two same-colored stars share one glow and one arm sprite, each tinted
    // from the alpha mask that is cached beside it.
    expect(cache.size).toBe(4);
    const cachedSprites = Array.from(cache.values());

    renderSpikes(ctx, params, cache);
    expect(cache.size).toBe(4);
    const spritesAfterRerender = Array.from(cache.values());
    for (let i = 0; i < cachedSprites.length; i++) {
      expect(spritesAfterRerender[i]).toBe(cachedSprites[i]);
    }
  });

  it('should reuse the alpha masks when a new star color appears', () => {
    // This is what keeps the Stars slider smooth: raising the cut admits stars
    // whose colors have never been seen, and each must cost a mask tint rather
    // than a fresh pixel-by-pixel sprite.
    const ctx = makeBlackContext();
    const cache: SpriteCache = new Map();

    renderSpikes(ctx, makeParams(), cache);
    const masks = Array.from(cache.entries()).filter(([key]) => key.includes('mask'));
    expect(masks.length).toBe(2);

    renderSpikes(
      ctx,
      makeParams({ stars: [makeStar({ id: 1, color: { r: 255, g: 128, b: 64 } })] }),
      cache,
    );

    // Two more tinted sprites, but the two masks are the same objects.
    expect(cache.size).toBe(6);
    for (const [key, mask] of masks) {
      expect(cache.get(key)).toBe(mask);
    }
  });

  it('should render a manually forced faint star with clearly visible spikes', () => {
    const canvasOwn = document.createElement('canvas');
    canvasOwn.width = 100;
    canvasOwn.height = 100;
    const ctxOwn = canvasOwn.getContext('2d');
    if (ctxOwn === null) {
      throw new Error('spec canvas has no 2d context');
    }
    const faint = makeStar({ id: 7, flux: 0.5 }); // 0.5% of fluxRef: sub-pixel spikes
    const armSampler = (ctx: CanvasRenderingContext2D): number => {
      // Mean brightness along one 45-degree arm, past the glow radius.
      let sum = 0;
      for (let r = 12; r <= 30; r++) {
        const x = Math.round(50 + r * Math.SQRT1_2);
        const y = Math.round(50 + r * Math.SQRT1_2);
        const d = ctx.getImageData(x, y, 1, 1).data;
        sum += d[0] + d[1] + d[2];
      }
      return sum;
    };

    renderSpikes(ctxOwn, makeParams({ stars: [faint] }), new Map());
    const unforced = armSampler(ctxOwn);

    ctxOwn.clearRect(0, 0, 100, 100);
    renderSpikes(
      ctxOwn,
      makeParams({ stars: [faint], forcedStarIds: new Set([7]) }),
      new Map(),
    );
    const forced = armSampler(ctxOwn);

    expect(forced).toBeGreaterThan(unforced + 200);
  });

  it('should shift every drawn element by the viewport offset', () => {
    const canvasOwn = document.createElement('canvas');
    canvasOwn.width = 100;
    canvasOwn.height = 100;
    const ctxOwn = canvasOwn.getContext('2d');
    if (ctxOwn === null) {
      throw new Error('spec canvas has no 2d context');
    }
    // Star at (30, 30) with a +20px offset must light up around (50, 50).
    // Short arms (lengthFactor 0.2) keep the drawing local, so the probe at
    // the un-offset position cannot accidentally sit on an arm.
    renderSpikes(
      ctxOwn,
      makeParams({
        stars: [makeStar({ x: 30, y: 30 })],
        offsetX: 20,
        offsetY: 20,
        lengthFactor: 0.2,
      }),
      new Map(),
    );
    const at = (x: number, y: number): number => {
      const d = ctxOwn.getImageData(x, y, 1, 1).data;
      return d[0] + d[1] + d[2];
    };
    expect(at(50, 50)).toBeGreaterThan(0);
    expect(at(30, 30)).toBe(0);
  });

  it('should keep the arms identical whatever the Glow amount says', () => {
    // Glow sizes the halo and nothing else: raising it must not brighten,
    // dim, or lengthen the arms. Sampled on the 45-degree arm beyond the
    // halo sprite's own footprint (its square corner at radius * sqrt 2), so
    // the probe sits past even the faintest tail of the skirt — well outside
    // its 2%-alpha radius — and sees the arm alone.
    const profile: HaloProfile = { ...DEFAULT_HALO_PROFILE, haloRadiusScale: 0.15 };
    const full = computeHaloGeometry(100, 100, profile, 1, 1, CANVAS_SIZE, 1);
    const onArmOutsideHalo = Math.ceil(full.haloRadiusPx * Math.SQRT2) + 2;
    expect(onArmOutsideHalo).toBeLessThan(36); // still on the 40 px arm
    const armAt = (glowFactor: number): number => {
      const ctx = makeBlackContext();
      renderSpikes(
        ctx,
        makeParams({ glowFactor, preset: makePreset({ haloProfile: profile }) }),
        new Map(),
      );
      return brightnessAtAngle(ctx, 45, onArmOutsideHalo);
    };

    const withoutGlow = armAt(0);
    expect(withoutGlow).toBeGreaterThan(0);
    expect(armAt(1)).toBe(withoutGlow);
  });

  describe('halo rendering', () => {
    /** Glow-mode params: wide halo, arms zeroed the way the mode seeds them. */
    function makeHaloParams(overrides: Partial<SpikeRenderParams> = {}): SpikeRenderParams {
      return makeParams({
        preset: makePreset({ haloProfile: WIDE_HALO_PROFILE }),
        glowFactor: 0.6,
        lengthFactor: 0,
        ...overrides,
      });
    }

    it('should draw the halo from halo sprites once the Glow amount is raised', () => {
      const ctx = makeBlackContext();
      const cache: SpriteCache = new Map();
      renderSpikes(ctx, makeHaloParams(), cache);

      // Lit well past the core, along an axis no arm could reach.
      expect(brightnessAtAngle(ctx, 0, 8)).toBeGreaterThan(0);
      const keys = Array.from(cache.keys());
      expect(keys.some((key) => key.startsWith('halo-mask:'))).toBeTrue();
      expect(keys.some((key) => key.startsWith('halo:'))).toBeTrue();
    });

    it('should grow a halo under a real spike preset as the Glow amount rises', () => {
      // Classic keeps its arms (Length 1) and still halos: the two are
      // independent layers on every preset. The notional image is 1000 px so
      // the tuned 8% halo radius lands at a measurable 80 px on the canvas.
      const imageMaxDimension = 1000;
      const classic = SPIKE_PRESETS.classic;
      const full = computeHaloGeometry(100, 100, classic.haloProfile, 1, 1, imageMaxDimension, 1);
      // Mid-halo: past the hot core, on the skirt's tail, off the 45-degree arms.
      const midHalo = Math.round(full.haloRadiusPx * 0.3);
      expect(midHalo).toBeGreaterThan(full.coreRadiusPx);
      const skirtAt = (glowFactor: number): number => {
        const ctx = makeBlackContext();
        renderSpikes(
          ctx,
          makeParams({ preset: classic, glowFactor, imageMaxDimension }),
          new Map(),
        );
        return brightnessAtAngle(ctx, 0, midHalo);
      };

      const off = skirtAt(0);
      const low = skirtAt(0.3);
      const high = skirtAt(1);
      expect(off).toBe(0);
      expect(high).toBeGreaterThan(low);
      expect(high).toBeGreaterThan(30);
    });

    it('should tint the skirt with the halo colour rather than the core colour', () => {
      // A bright star's core reads white, so its halo would too if the skirt
      // took the core colour. The halo colour is what the mist look needs.
      const ctx = makeBlackContext();
      const whiteCoreBlueSkirt = makeStar({
        color: { r: 255, g: 255, b: 255 },
        haloColor: { r: 0, g: 0, b: 255 },
      });
      const halo = computeHaloGeometry(100, 100, WIDE_HALO_PROFILE, 1, 1, CANVAS_SIZE, 1);
      renderSpikes(
        ctx,
        makeHaloParams({ stars: [whiteCoreBlueSkirt], glowFactor: 1 }),
        new Map(),
      );

      // Just outside the whitened core, where only the skirt paints.
      const fringe = channelsAt(ctx, CENTER + Math.round(halo.coreRadiusPx * 1.3), CENTER);
      expect(fringe.b).toBeGreaterThan(10);
      expect(fringe.r).toBeLessThan(fringe.b / 4);
      expect(fringe.g).toBeLessThan(fringe.b / 4);
    });

    it('should whiten the hot core while the fringe keeps the halo colour', () => {
      const ctx = makeBlackContext();
      const red = makeStar({
        color: { r: 255, g: 0, b: 0 },
        haloColor: { r: 255, g: 0, b: 0 },
      });
      renderSpikes(ctx, makeHaloParams({ stars: [red], glowFactor: 1 }), new Map());

      const center = channelsAt(ctx, CENTER, CENTER);
      // The whitened core lights the green/blue channels of a pure-red star...
      expect(center.g).toBeGreaterThan(20);
      expect(center.b).toBeGreaterThan(20);
      // ...while the skirt outside the core stays red-dominant.
      const fringe = channelsAt(ctx, CENTER + 14, CENTER);
      expect(fringe.r).toBeGreaterThan(0);
      expect(fringe.r).toBeGreaterThan(fringe.g + 2);
    });

    it('should keep a bright skirt below white over a bright background instead of clipping to a disc', () => {
      // Additive compositing on a bright sky pushes a strong skirt past 255
      // and the halo becomes a flat white disc with a hard edge. Screen
      // approaches white asymptotically: over a backdrop B a skirt that adds
      // S on black lands at B + S * (1 - B / 255), never at 255.
      const backdrop = 160;
      const profile: HaloProfile = {
        ...WIDE_HALO_PROFILE,
        haloIntensity: 1,
        coreRadiusRatio: 0.1,
      };
      const params = makeHaloParams({
        preset: makePreset({ haloProfile: profile }),
        glowFactor: 1,
      });
      const halo = computeHaloGeometry(100, 100, profile, 1, 1, CANVAS_SIZE, 1);
      const onBlack = makeBlackContext();
      renderSpikes(onBlack, params, new Map());
      const onGrey = makeContext(`rgb(${backdrop}, ${backdrop}, ${backdrop})`);
      renderSpikes(onGrey, params, new Map());

      // Just past the (tiny) core, where the skirt alone paints — and paints
      // hard enough that 'lighter' would have clipped it.
      const coreEdge = Math.ceil(halo.coreRadiusPx) + 1;
      const addedOnBlack = channelsAt(onBlack, CENTER + coreEdge, CENTER).r;
      expect(backdrop + addedOnBlack).toBeGreaterThan(255);
      const screened = channelsAt(onGrey, CENTER + coreEdge, CENTER).r;
      expect(screened).toBeLessThan(255);
      const expectedScreen = backdrop + addedOnBlack * (1 - backdrop / 255);
      expect(Math.abs(screened - expectedScreen)).toBeLessThanOrEqual(4);

      // No plateau anywhere: the profile keeps falling from the core edge to
      // the skirt's edge, so the halo reads as a halo and not a disc.
      const skirtEdge = Math.floor(halo.haloRadiusPx);
      let previous = screened;
      for (let r = coreEdge + 1; r <= skirtEdge; r++) {
        const value = channelsAt(onGrey, CENTER + r, CENTER).r;
        expect(value).toBeLessThanOrEqual(previous);
        expect(value).toBeGreaterThanOrEqual(backdrop);
        previous = value;
      }
      expect(previous).toBeLessThan(screened);
    });

    it('should draw nothing at all for a star below the visibility cutoff', () => {
      const ctx = makeBlackContext();
      const cache: SpriteCache = new Map();
      // 0.1% of the reference flux: h = 0.032, halo alpha 0.9 * 0.032 * 0.6 =
      // 0.017 — under the cutoff, so the star must cost neither pixels nor
      // sprites.
      renderSpikes(ctx, makeHaloParams({ stars: [makeStar({ flux: 0.1 })] }), cache);

      expect(cache.size).toBe(0);
      expectAllBlack(ctx);
    });

    it('should shrink the halo as stars get fainter', () => {
      const haloReach = (flux: number): number => {
        const ctx = makeBlackContext();
        renderSpikes(ctx, makeHaloParams({ stars: [makeStar({ flux })] }), new Map());
        return reachAlongAxis(ctx);
      };

      const bright = haloReach(100);
      const mid = haloReach(10);
      expect(mid).toBeGreaterThan(0);
      expect(bright).toBeGreaterThan(mid + 2);
    });

    it('should burn brighter as the global Brightness rises', () => {
      // Brightness is burn, not reach: the radius invariance is asserted
      // exactly in the geometry spec, where 8-bit tail rounding cannot blur
      // it the way counting lit canvas pixels does.
      const skirtAt = (intensityFactor: number): number => {
        const ctx = makeBlackContext();
        renderSpikes(ctx, makeHaloParams({ intensityFactor }), new Map());
        return brightnessAtAngle(ctx, 0, 6);
      };
      expect(skirtAt(2)).toBeGreaterThan(skirtAt(0.5) + 30);
    });

    it('should draw nothing at zero Brightness', () => {
      const ctx = makeBlackContext();
      renderSpikes(ctx, makeHaloParams({ intensityFactor: 0 }), new Map());
      expectAllBlack(ctx);
    });

    it('should halo a star that pins its own amount while the global Glow sits at zero', () => {
      const ctx = makeBlackContext();
      renderSpikes(
        ctx,
        makeHaloParams({
          glowFactor: 0,
          adjustments: new Map([[0, { ...DEFAULT_STAR_ADJUSTMENT, glow: 1 }]]),
        }),
        new Map(),
      );
      expect(brightnessAtAngle(ctx, 0, 8)).toBeGreaterThan(0);
    });

    it('should still halo a faint star inside the cut once the user pins its own amount', () => {
      // 0.05% of the reference flux sits far under the visibility cutoff on
      // its own (h = 0.022). Pinning an amount is the halo's way of forcing a
      // star on, so it earns the forced-flux floor and answers visibly.
      const silent = makeBlackContext();
      renderSpikes(silent, makeHaloParams({ stars: [makeStar({ flux: 0.05 })] }), new Map());
      expectAllBlack(silent);

      const pinned = makeBlackContext();
      renderSpikes(
        pinned,
        makeHaloParams({
          stars: [makeStar({ flux: 0.05 })],
          adjustments: new Map([[0, { ...DEFAULT_STAR_ADJUSTMENT, glow: 1 }]]),
        }),
        new Map(),
      );
      expect(brightnessAtAngle(pinned, 0, 4)).toBeGreaterThan(0);
    });

    it('should leave the halo alone when only the star\'s own brightness is tweaked', () => {
      // The per-star brightness multiplier is an arm-only concept; the halo
      // answers to the global Brightness alone, so zeroing one star's own
      // brightness must not touch its halo.
      const skirtAt = (intensityFactor: number): number => {
        const ctx = makeBlackContext();
        renderSpikes(
          ctx,
          makeHaloParams({
            adjustments: new Map([[0, { ...DEFAULT_STAR_ADJUSTMENT, intensityFactor }]]),
          }),
          new Map(),
        );
        return brightnessAtAngle(ctx, 0, 8);
      };

      const untouched = skirtAt(1);
      expect(untouched).toBeGreaterThan(0);
      expect(skirtAt(0)).toBe(untouched);
    });
  });
});
