import { DetectedStar } from '../models/detected-star.model';
import { SpikePreset } from '../models/spike-preset.model';
import { SpikeRenderParams, SpriteCache } from '../models/spike-render-params.model';
import { renderSpikes } from './spike-render.util';

const CANVAS_SIZE = 100;
const CENTER = 50;
const SAMPLE_RADIUS = 15;

/** Builds a fully populated test preset with selective overrides. */
function makePreset(overrides: Partial<SpikePreset> = {}): SpikePreset {
  return {
    id: 'classic',
    label: 'Test',
    description: 'Test preset',
    spikeCount: 4,
    // lengthPx = 100 * 0.4 = 40, thicknessPx = 4, glowRadiusPx = 8.
    lengthScale: 0.4,
    glowRadiusScale: 0.08,
    intensityScale: 1,
    thicknessRatio: 0.1,
    falloffGamma: 1,
    glowRadiusRatio: 2,
    glowIntensity: 0.5,
    rotationOffsetDeg: 45,
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
    diffusionFactor: 0,
    imageMaxDimension: CANVAS_SIZE,
    scale: 1,
    ...overrides,
  };
}

/** Creates a square canvas context filled opaque black. */
function makeBlackContext(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('2D context unavailable in test');
  }
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  return ctx;
}

/** Sums the RGB channels of the pixel at (x, y). */
function brightnessAt(ctx: CanvasRenderingContext2D, x: number, y: number): number {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return d[0] + d[1] + d[2];
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

    renderSpikes(ctx, makeParams(), new Map());

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
    const image = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
    for (let i = 0; i < image.length; i += 4) {
      expect(image[i] + image[i + 1] + image[i + 2]).toBe(0);
    }
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


  it('should size a bloom by the star brightness rather than the arm thickness', () => {
    const bloomRadius = (flux: number): number => {
      const ctx = makeBlackContext();
      renderSpikes(
        ctx,
        makeParams({
          stars: [makeStar({ flux })],
          diffusionFactor: 1,
          preset: makePreset({ glowRadiusScale: 0.3 }),
        }),
        new Map(),
      );
      let radius = 0;
      for (let r = 1; r < CENTER; r++) {
        if (brightnessAtAngle(ctx, 0, r) > 0) {
          radius = r;
        }
      }
      return radius;
    };

    // Under the old arm-derived formula both would clamp to the same few
    // pixels, and the brightness ordering would be invisible.
    expect(bloomRadius(100)).toBeGreaterThan(bloomRadius(3) + 2);
  });


  it('should render a preset the same whatever diffusion says', () => {
    const zero = makeBlackContext();
    renderSpikes(zero, makeParams({ diffusionFactor: 0 }), new Map());
    const armAt = (ctx: CanvasRenderingContext2D) => brightnessAtAngle(ctx, 45, SAMPLE_RADIUS);

    // The arms are at full strength and no bloom competes with them.
    expect(armAt(zero)).toBeGreaterThan(0);
    expect(brightnessAtAngle(zero, 0, 8)).toBe(brightnessAtAngle(zero, 90, 8));
  });


  it('should grow the bloom as diffusion rises', () => {
    const bloomReach = (diffusionFactor: number): number => {
      const ctx = makeBlackContext();
      renderSpikes(
        ctx,
        makeParams({ diffusionFactor, preset: makePreset({ glowRadiusScale: 0.25 }) }),
        new Map(),
      );
      // Along an axis, where the 45-degree arms never reach.
      let reach = 0;
      for (let r = 1; r < CENTER; r++) {
        if (brightnessAtAngle(ctx, 0, r) > 0) reach = r;
      }
      return reach;
    };

    expect(bloomReach(0.25)).toBeGreaterThan(0);
    expect(bloomReach(1)).toBeGreaterThan(bloomReach(0.25));
  });

});
