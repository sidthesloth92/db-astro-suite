import { DEFAULT_MIST_PROFILE } from '../constants/mist.constants';
import { MistDrawRegion, MistProfile } from '../models/mist-profile.model';
import { SRGB_TO_LINEAR } from './linear-light.util';
import { buildMistLayer, drawMistLayer, mistLayerCacheKey } from './mist-layer.util';

/** Side of the square source the tail tests use; under the working size, so it is never shrunk. */
const SOURCE_SIZE = 200;
/** Side of the bright square painted at the centre of that source. */
const SQUARE_SIZE = 24;
/** First column and row of the bright square. */
const SQUARE_START = (SOURCE_SIZE - SQUARE_SIZE) / 2;
/** First column and row past the bright square. */
const SQUARE_END = SQUARE_START + SQUARE_SIZE;
/** Row through the middle of the square along which the tail is sampled. */
const MID = SOURCE_SIZE / 2;
/** Width of the frame border no mist from the centre square reaches. */
const DARK_BORDER = 12;
/** Side of the hand-made layers the draw tests screen onto a canvas. */
const LAYER_SIZE = 64;

/**
 * Profile the geometry tests pin explicitly, so retuning the shipped preset
 * cannot silently move the tail they measure. On a 200 px copy the scales
 * blur at radii 4, 10 and 24 px; three box passes carry light at most 72 px
 * from the square, well short of the 12 px frame border the tests expect
 * to stay black.
 */
const TEST_PROFILE: MistProfile = {
  thresholdLinear: 0.13,
  kneePower: 1.5,
  radiusScales: [0.02, 0.05, 0.12],
  radiusWeights: [0.4, 0.35, 0.25],
  saturationBoost: 1.4,
  gain: 1.6,
  workMaxDimension: 512,
};

/** Returns the 2D context of a canvas, failing the test if the browser has none. */
function contextOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('2D context unavailable in test');
  }
  return ctx;
}

/** Creates an opaque canvas of the given size filled with `fill`, then lets `paint` draw on it. */
function makeCanvas(
  width: number,
  height: number,
  fill: string,
  paint?: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = contextOf(canvas);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);
  paint?.(ctx);
  return canvas;
}

/** Creates the standard black source with a centred square of the given CSS colour. */
function squareSource(fill: string): HTMLCanvasElement {
  return makeCanvas(SOURCE_SIZE, SOURCE_SIZE, 'black', (ctx) => {
    ctx.fillStyle = fill;
    ctx.fillRect(SQUARE_START, SQUARE_START, SQUARE_SIZE, SQUARE_SIZE);
  });
}

/** Builds the mist layer of the standard square source under the pinned test profile. */
function squareLayer(fill: string, profile: MistProfile = TEST_PROFILE): HTMLCanvasElement {
  return buildMistLayer(squareSource(fill), SOURCE_SIZE, SOURCE_SIZE, profile);
}

/** Reads the whole RGBA buffer of a canvas. */
function pixelsOf(canvas: HTMLCanvasElement): Uint8ClampedArray {
  return contextOf(canvas).getImageData(0, 0, canvas.width, canvas.height).data;
}

/** Reads the RGB triple at (x, y) of a canvas. */
function rgbAt(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
): { r: number; g: number; b: number } {
  const d = contextOf(canvas).getImageData(x, y, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2] };
}

/** Reads the red byte at (x, y) of a canvas: the brightness of a neutral pixel. */
function levelAt(canvas: HTMLCanvasElement, x: number, y: number): number {
  return rgbAt(canvas, x, y).r;
}

/** The brightest RGB byte anywhere on a canvas. */
function brightestOf(canvas: HTMLCanvasElement): number {
  const data = pixelsOf(canvas);
  let brightest = 0;
  for (let i = 0; i < data.length; i += 4) {
    brightest = Math.max(brightest, data[i], data[i + 1], data[i + 2]);
  }
  return brightest;
}

/** The lowest alpha byte anywhere on a canvas. */
function lowestAlphaOf(canvas: HTMLCanvasElement): number {
  const data = pixelsOf(canvas);
  let lowest = 255;
  for (let i = 3; i < data.length; i += 4) {
    lowest = Math.min(lowest, data[i]);
  }
  return lowest;
}

/** The lowest RGB byte anywhere on a canvas. */
function darkestOf(canvas: HTMLCanvasElement): number {
  const data = pixelsOf(canvas);
  let darkest = 255;
  for (let i = 0; i < data.length; i += 4) {
    darkest = Math.min(darkest, data[i], data[i + 1], data[i + 2]);
  }
  return darkest;
}

/** Linear-light ratios of the green and blue channels to red at (x, y). */
function chromaRatiosAt(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
): { greenToRed: number; blueToRed: number } {
  const { r, g, b } = rgbAt(canvas, x, y);
  const red = SRGB_TO_LINEAR[r];
  return { greenToRed: SRGB_TO_LINEAR[g] / red, blueToRed: SRGB_TO_LINEAR[b] / red };
}

/** A hand-made square layer whose columns ramp from black up to sRGB 252. */
function rampLayer(): HTMLCanvasElement {
  return makeCanvas(LAYER_SIZE, LAYER_SIZE, 'black', (ctx) => {
    for (let x = 0; x < LAYER_SIZE; x++) {
      const level = x * 4;
      ctx.fillStyle = `rgb(${level}, ${level}, ${level})`;
      ctx.fillRect(x, 0, 1, LAYER_SIZE);
    }
  });
}

/** A hand-made square layer that is black except for a white block in its left half. */
function leftBlockLayer(): HTMLCanvasElement {
  return makeCanvas(LAYER_SIZE, LAYER_SIZE, 'black', (ctx) => {
    ctx.fillStyle = 'white';
    ctx.fillRect(8, 8, 16, 16);
  });
}

/** A region covering the whole image, drawn 1:1 onto a canvas of the same size. */
function wholeImageRegion(width: number, height: number): MistDrawRegion {
  return {
    sourceX: 0,
    sourceY: 0,
    sourceWidth: width,
    sourceHeight: height,
    imageWidth: width,
    imageHeight: height,
    targetWidth: width,
    targetHeight: height,
  };
}

/**
 * One horizontal half of a 640 px square image drawn onto a 100 x 200 canvas,
 * as the stage does when the viewport shows half the frame. A layer block at
 * x 8..24 of 64 sits at image x 80..240, which is canvas x 25..75 of the
 * left half and off the right half entirely.
 */
function halfImageRegion(half: 'left' | 'right'): MistDrawRegion {
  return {
    sourceX: half === 'left' ? 0 : 320,
    sourceY: 0,
    sourceWidth: 320,
    sourceHeight: 640,
    imageWidth: 640,
    imageHeight: 640,
    targetWidth: 100,
    targetHeight: 200,
  };
}

describe('buildMistLayer', () => {
  describe('with the shipped profile', () => {
    it('should turn a black source into an opaque black layer', () => {
      const source = makeCanvas(SOURCE_SIZE, SOURCE_SIZE, 'black');
      const layer = buildMistLayer(source, SOURCE_SIZE, SOURCE_SIZE, DEFAULT_MIST_PROFILE);

      expect(layer.width).toBe(SOURCE_SIZE);
      expect(layer.height).toBe(SOURCE_SIZE);
      expect(brightestOf(layer)).toBe(0);
      expect(lowestAlphaOf(layer)).toBe(255);
    });

    it('should keep sky grey below the threshold out of the mist', () => {
      const source = makeCanvas(SOURCE_SIZE, SOURCE_SIZE, 'rgb(60, 60, 60)');
      const layer = buildMistLayer(source, SOURCE_SIZE, SOURCE_SIZE, DEFAULT_MIST_PROFILE);

      expect(brightestOf(layer)).toBe(0);
      expect(lowestAlphaOf(layer)).toBe(255);
    });

    it('should keep a carpet of faint stars out of the mist', () => {
      const source = makeCanvas(SOURCE_SIZE, SOURCE_SIZE, 'black', (ctx) => {
        ctx.fillStyle = 'rgb(95, 95, 95)';
        for (let y = 0; y < SOURCE_SIZE; y += 7) {
          for (let x = (y / 7) % 5; x < SOURCE_SIZE; x += 11) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      });
      const layer = buildMistLayer(source, SOURCE_SIZE, SOURCE_SIZE, DEFAULT_MIST_PROFILE);

      expect(brightestOf(layer)).toBe(0);
    });

    it('should mist an all-white source evenly right up to the frame edge', () => {
      const source = makeCanvas(SOURCE_SIZE, SOURCE_SIZE, 'white');
      const layer = buildMistLayer(source, SOURCE_SIZE, SOURCE_SIZE, DEFAULT_MIST_PROFILE);

      // Replicated edges: the border and corners carry the same light as the middle.
      expect(darkestOf(layer)).toBe(255);
    });

    it('should build the layer at the working size with the aspect kept for a large source', () => {
      const landscape = makeCanvas(1024, 640, 'black', (ctx) => {
        ctx.fillStyle = 'white';
        ctx.fillRect(480, 288, 64, 64);
      });
      const portrait = makeCanvas(640, 1024, 'black');

      const landscapeLayer = buildMistLayer(landscape, 1024, 640, DEFAULT_MIST_PROFILE);
      const portraitLayer = buildMistLayer(portrait, 640, 1024, DEFAULT_MIST_PROFILE);

      expect(landscapeLayer.width).toBe(DEFAULT_MIST_PROFILE.workMaxDimension);
      expect(landscapeLayer.height).toBe(DEFAULT_MIST_PROFILE.workMaxDimension * 0.625);
      expect(portraitLayer.width).toBe(DEFAULT_MIST_PROFILE.workMaxDimension * 0.625);
      expect(portraitLayer.height).toBe(DEFAULT_MIST_PROFILE.workMaxDimension);
      // The square shrinks with the frame: bright at the layer's centre, dark in its corner.
      expect(levelAt(landscapeLayer, 256, 160)).toBeGreaterThan(128);
      expect(levelAt(landscapeLayer, 2, 2)).toBe(0);
    });

    it('should build the layer at the source size for a small source', () => {
      const source = makeCanvas(200, 150, 'black');
      const layer = buildMistLayer(source, 200, 150, DEFAULT_MIST_PROFILE);

      expect(layer.width).toBe(200);
      expect(layer.height).toBe(150);
    });

    it('should cope with a one-pixel source', () => {
      const source = makeCanvas(1, 1, 'white');
      const layer = buildMistLayer(source, 1, 1, DEFAULT_MIST_PROFILE);

      expect(layer.width).toBe(1);
      expect(layer.height).toBe(1);
      expect(rgbAt(layer, 0, 0)).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('around a bright square', () => {
    it('should be bright at the square and still lit one square-width beyond its edge', () => {
      const layer = squareLayer('white');

      const centre = levelAt(layer, MID, MID);
      const justOutside = levelAt(layer, SQUARE_END, MID);
      const oneWidthOut = levelAt(layer, SQUARE_END + SQUARE_SIZE, MID);

      expect(centre).toBeGreaterThan(200);
      expect(justOutside).toBeGreaterThan(0);
      expect(justOutside).toBeLessThan(centre);
      expect(oneWidthOut).toBeGreaterThan(0);
      expect(oneWidthOut).toBeLessThan(justOutside);
    });

    it('should fade monotonically with distance from the square along its centre row', () => {
      const layer = squareLayer('white');
      const data = pixelsOf(layer);
      const rowOffset = MID * SOURCE_SIZE * 4;

      let previous = data[rowOffset + MID * 4];
      for (let x = MID + 1; x < SOURCE_SIZE; x++) {
        const current = data[rowOffset + x * 4];
        expect(current).withContext(`column ${x}`).toBeLessThanOrEqual(previous);
        previous = current;
      }
    });

    it('should leave the sky far from the square exactly black', () => {
      const layer = squareLayer('white');
      const data = pixelsOf(layer);

      let brightestInBorder = 0;
      for (let y = 0; y < SOURCE_SIZE; y++) {
        for (let x = 0; x < SOURCE_SIZE; x++) {
          const inBorder =
            x < DARK_BORDER ||
            y < DARK_BORDER ||
            x >= SOURCE_SIZE - DARK_BORDER ||
            y >= SOURCE_SIZE - DARK_BORDER;
          if (!inBorder) {
            continue;
          }
          const i = (y * SOURCE_SIZE + x) * 4;
          brightestInBorder = Math.max(brightestInBorder, data[i], data[i + 1], data[i + 2]);
        }
      }

      expect(brightestInBorder).toBe(0);
      expect(lowestAlphaOf(layer)).toBe(255);
    });

    it('should keep the mist beside a red square red', () => {
      const layer = squareLayer('rgb(255, 0, 0)');

      for (const x of [MID, SQUARE_END + 4]) {
        const { r, g, b } = rgbAt(layer, x, MID);
        expect(r).withContext(`red at column ${x}`).toBeGreaterThan(0);
        expect(r).toBeGreaterThan(g);
        expect(r).toBeGreaterThan(b);
      }
    });

    it("should hold a warm square's colour ratios when the saturation boost is 1", () => {
      // Every channel is blurred with the same kernel, so the mist of a single
      // colour keeps that colour's linear ratios until re-saturation moves them.
      const layer = squareLayer('rgb(255, 200, 120)', { ...TEST_PROFILE, saturationBoost: 1 });
      const sourceGreenToRed = SRGB_TO_LINEAR[200];
      const sourceBlueToRed = SRGB_TO_LINEAR[120];

      for (const x of [MID, SQUARE_END + 4]) {
        const ratios = chromaRatiosAt(layer, x, MID);
        expect(ratios.greenToRed).withContext(`column ${x}`).toBeCloseTo(sourceGreenToRed, 1);
        expect(ratios.blueToRed).withContext(`column ${x}`).toBeCloseTo(sourceBlueToRed, 1);
      }
    });

    it('should deepen the colour of the mist beside a warm square with the saturation boost', () => {
      const layer = squareLayer('rgb(255, 200, 120)');
      const { r, g, b } = rgbAt(layer, SQUARE_END + 4, MID);
      const ratios = chromaRatiosAt(layer, SQUARE_END + 4, MID);

      expect(r).toBeGreaterThan(g);
      expect(g).toBeGreaterThanOrEqual(b);
      expect(ratios.greenToRed).toBeLessThan(SRGB_TO_LINEAR[200]);
      expect(ratios.blueToRed).toBeLessThan(SRGB_TO_LINEAR[120]);
    });

    it('should add no light from a scale whose weight is missing or zero', () => {
      // Only the tightest scale (radius 4, reach 12 px) is left weighted; the
      // wider ones must contribute nothing, so one square-width out is dark.
      const missing = squareLayer('white', { ...TEST_PROFILE, radiusWeights: [0.4] });
      const zeroed = squareLayer('white', { ...TEST_PROFILE, radiusWeights: [0.4, 0, 0] });

      for (const layer of [missing, zeroed]) {
        expect(levelAt(layer, SQUARE_END + 4, MID)).toBeGreaterThan(0);
        expect(levelAt(layer, SQUARE_END + SQUARE_SIZE, MID)).toBe(0);
        expect(lowestAlphaOf(layer)).toBe(255);
      }
      expect(pixelsOf(missing)).toEqual(pixelsOf(zeroed));
    });

    it('should spread a faint even mist when the whole frame sits just above the threshold', () => {
      const source = makeCanvas(SOURCE_SIZE, SOURCE_SIZE, 'rgb(110, 110, 110)');
      const layer = buildMistLayer(source, SOURCE_SIZE, SOURCE_SIZE, TEST_PROFILE);

      expect(darkestOf(layer)).toBeGreaterThan(0);
      expect(darkestOf(layer)).toBe(brightestOf(layer));
    });
  });
});

describe('drawMistLayer', () => {
  it('should leave the canvas untouched at amount 0 or below', () => {
    const layer = rampLayer();
    const target = makeCanvas(LAYER_SIZE, LAYER_SIZE, 'rgb(40, 40, 40)');
    const before = Array.from(pixelsOf(target));

    drawMistLayer(contextOf(target), layer, 0, wholeImageRegion(LAYER_SIZE, LAYER_SIZE));
    expect(Array.from(pixelsOf(target))).toEqual(before);

    drawMistLayer(contextOf(target), layer, -0.5, wholeImageRegion(LAYER_SIZE, LAYER_SIZE));
    expect(Array.from(pixelsOf(target))).toEqual(before);
  });

  it('should draw nothing for an empty image region', () => {
    const layer = rampLayer();
    const target = makeCanvas(LAYER_SIZE, LAYER_SIZE, 'black');
    const before = Array.from(pixelsOf(target));

    drawMistLayer(contextOf(target), layer, 1, {
      ...wholeImageRegion(LAYER_SIZE, LAYER_SIZE),
      imageWidth: 0,
    });

    expect(Array.from(pixelsOf(target))).toEqual(before);
  });

  it('should reproduce the layer when screened at full amount over black', () => {
    const layer = rampLayer();
    const target = makeCanvas(LAYER_SIZE, LAYER_SIZE, 'black');

    drawMistLayer(contextOf(target), layer, 1, wholeImageRegion(LAYER_SIZE, LAYER_SIZE));

    const expected = pixelsOf(layer);
    const actual = pixelsOf(target);
    for (let i = 0; i < expected.length; i += 4) {
      expect(Math.abs(actual[i] - expected[i]))
        .withContext(`pixel ${i / 4}`)
        .toBeLessThanOrEqual(1);
    }
  });

  it('should scale the added light linearly with the amount over black', () => {
    const layer = rampLayer();
    const target = makeCanvas(LAYER_SIZE, LAYER_SIZE, 'black');

    drawMistLayer(contextOf(target), layer, 0.5, wholeImageRegion(LAYER_SIZE, LAYER_SIZE));

    const mist = pixelsOf(layer);
    const actual = pixelsOf(target);
    for (let i = 0; i < mist.length; i += 4) {
      expect(Math.abs(actual[i] - mist[i] / 2))
        .withContext(`pixel ${i / 4}`)
        .toBeLessThanOrEqual(1);
    }
  });

  it('should leave a white canvas white', () => {
    const layer = rampLayer();
    const target = makeCanvas(LAYER_SIZE, LAYER_SIZE, 'white');

    drawMistLayer(contextOf(target), layer, 1, wholeImageRegion(LAYER_SIZE, LAYER_SIZE));

    expect(darkestOf(target)).toBe(255);
  });

  it('should lift a mid-grey canvas by the screen of the mist without ever clipping', () => {
    const grey = 128;
    const layer = rampLayer();
    const target = makeCanvas(LAYER_SIZE, LAYER_SIZE, `rgb(${grey}, ${grey}, ${grey})`);

    drawMistLayer(contextOf(target), layer, 1, wholeImageRegion(LAYER_SIZE, LAYER_SIZE));

    const mist = pixelsOf(layer);
    const actual = pixelsOf(target);
    for (let i = 0; i < mist.length; i += 4) {
      const screened = grey + (mist[i] * (255 - grey)) / 255;
      expect(actual[i])
        .withContext(`pixel ${i / 4}`)
        .toBeGreaterThanOrEqual(grey);
      expect(actual[i]).toBeLessThanOrEqual(255);
      expect(Math.abs(actual[i] - screened))
        .withContext(`pixel ${i / 4}`)
        .toBeLessThanOrEqual(2);
    }
    // The brightest column must land clearly above the grey it was screened over.
    expect(levelAt(target, LAYER_SIZE - 1, 0)).toBeGreaterThan(grey + 100);
  });

  it('should map the image region onto the layer so a half-frame draw shows only that half', () => {
    const layer = leftBlockLayer();
    const leftTarget = makeCanvas(100, 200, 'black');
    const rightTarget = makeCanvas(100, 200, 'black');

    drawMistLayer(contextOf(leftTarget), layer, 1, halfImageRegion('left'));
    drawMistLayer(contextOf(rightTarget), layer, 1, halfImageRegion('right'));

    expect(levelAt(leftTarget, 50, 50)).toBeGreaterThan(200);
    expect(levelAt(leftTarget, 90, 50)).toBe(0);
    expect(levelAt(leftTarget, 50, 150)).toBe(0);
    expect(brightestOf(rightTarget)).toBe(0);
  });

  it('should land the region at the canvas origin whatever transform the context carries', () => {
    const layer = leftBlockLayer();
    const target = makeCanvas(100, 200, 'black');
    const ctx = contextOf(target);
    ctx.translate(30, 0);

    drawMistLayer(ctx, layer, 1, halfImageRegion('left'));

    expect(levelAt(target, 50, 50)).toBeGreaterThan(200);
    expect(levelAt(target, 90, 50)).toBe(0);
  });

  it('should restore the alpha, composite operation, smoothing, and transform it changed', () => {
    const layer = rampLayer();
    const target = makeCanvas(LAYER_SIZE, LAYER_SIZE, 'black');
    const ctx = contextOf(target);
    ctx.globalAlpha = 0.3;
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'low';
    ctx.translate(7, 3);

    drawMistLayer(ctx, layer, 0.8, wholeImageRegion(LAYER_SIZE, LAYER_SIZE));

    expect(ctx.globalAlpha).toBeCloseTo(0.3, 6);
    expect(ctx.globalCompositeOperation).toBe('multiply');
    expect(ctx.imageSmoothingEnabled).toBeFalse();
    expect(ctx.imageSmoothingQuality).toBe('low');
    const transform = ctx.getTransform();
    expect([transform.a, transform.b, transform.c, transform.d, transform.e, transform.f]).toEqual([
      1, 0, 0, 1, 7, 3,
    ]);
  });
});

describe('mistLayerCacheKey', () => {
  it('should give structurally equal profiles the same key', () => {
    const copy: MistProfile = {
      ...DEFAULT_MIST_PROFILE,
      radiusScales: [...DEFAULT_MIST_PROFILE.radiusScales],
      radiusWeights: [...DEFAULT_MIST_PROFILE.radiusWeights],
    };

    expect(copy).not.toBe(DEFAULT_MIST_PROFILE);
    expect(mistLayerCacheKey(copy)).toBe(mistLayerCacheKey(DEFAULT_MIST_PROFILE));
  });

  it('should change the key when any field of the profile changes', () => {
    const base = DEFAULT_MIST_PROFILE;
    const variants: MistProfile[] = [
      { ...base, thresholdLinear: base.thresholdLinear + 0.01 },
      { ...base, kneePower: base.kneePower + 0.5 },
      { ...base, radiusScales: base.radiusScales.map((s, i) => (i === 0 ? s * 2 : s)) },
      { ...base, radiusWeights: base.radiusWeights.map((w, i) => (i === 0 ? w / 2 : w)) },
      { ...base, saturationBoost: base.saturationBoost + 0.1 },
      { ...base, gain: base.gain + 0.1 },
      { ...base, workMaxDimension: base.workMaxDimension + 1 },
    ];
    const baseKey = mistLayerCacheKey(base);
    const keys = variants.map(mistLayerCacheKey);

    for (const key of keys) {
      expect(key).not.toBe(baseKey);
    }
    expect(new Set(keys).size).toBe(variants.length);
  });
});
