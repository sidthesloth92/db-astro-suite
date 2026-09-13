import { THEME_DESIGN_HEIGHT, THEME_DESIGN_WIDTH } from '../constants/theme-canvas.constants';
import { DEFAULT_THEME_BASIS, computeThemeCanvas, resolveThemeBasis } from './theme-canvas.util';

/** Card width the themed (bleed) preview lays out at. */
const CARD_WIDTH = 538;

describe('computeThemeCanvas', () => {
  it('renders a card at the design aspect on the artboard itself', () => {
    const canvas = computeThemeCanvas(CARD_WIDTH, 540 / 720);

    expect(canvas.width).toBe(THEME_DESIGN_WIDTH);
    expect(canvas.height).toBe(THEME_DESIGN_HEIGHT);
    expect(canvas.scale).toBeCloseTo(CARD_WIDTH / THEME_DESIGN_WIDTH, 6);
  });

  it('keeps the full design height on a card shorter than the artboard', () => {
    // A square card is 180 px shorter than the 540 x 720 artboard. The
    // canvas must widen rather than steal height, or the tail of the
    // theme's content is clipped.
    const canvas = computeThemeCanvas(CARD_WIDTH, 1);

    expect(canvas.height).toBe(THEME_DESIGN_HEIGHT);
    expect(canvas.width).toBe(THEME_DESIGN_HEIGHT);
  });

  it('keeps the full design width on a card narrower than the artboard', () => {
    const canvas = computeThemeCanvas(CARD_WIDTH, 9 / 16);

    expect(canvas.width).toBe(THEME_DESIGN_WIDTH);
    expect(canvas.height).toBeCloseTo(THEME_DESIGN_WIDTH / (9 / 16), 6);
  });

  it('never gives a theme less room than its artboard, at any aspect', () => {
    for (const aspect of [9 / 16, 0.75, 0.8, 1, 1.91]) {
      const canvas = computeThemeCanvas(CARD_WIDTH, aspect);

      expect(canvas.width)
        .withContext(`width at aspect ${aspect}`)
        .toBeGreaterThanOrEqual(THEME_DESIGN_WIDTH - 0.001);
      expect(canvas.height)
        .withContext(`height at aspect ${aspect}`)
        .toBeGreaterThanOrEqual(THEME_DESIGN_HEIGHT - 0.001);
    }
  });

  it('produces a canvas that exactly covers the card once scaled', () => {
    for (const aspect of [9 / 16, 0.75, 1, 1.91]) {
      const canvas = computeThemeCanvas(CARD_WIDTH, aspect);

      expect(canvas.width * canvas.scale).toBeCloseTo(CARD_WIDTH, 6);
      expect(canvas.height * canvas.scale).toBeCloseTo(CARD_WIDTH / aspect, 6);
    }
  });

  it('honours a theme that declares its own artboard', () => {
    const canvas = computeThemeCanvas(CARD_WIDTH, 1, { width: 480, height: 640 });

    expect(canvas.height).toBe(640);
    expect(canvas.width).toBe(640);
  });

  it('falls back to the artboard aspect when the card aspect is unusable', () => {
    for (const aspect of [0, Number.NaN, Number.POSITIVE_INFINITY]) {
      const canvas = computeThemeCanvas(CARD_WIDTH, aspect);

      expect(canvas.width).toBe(DEFAULT_THEME_BASIS.width);
      expect(canvas.height).toBe(DEFAULT_THEME_BASIS.height);
    }
  });

  it('leaves the canvas unscaled until the card has been measured', () => {
    expect(computeThemeCanvas(0, 1).scale).toBe(1);
  });
});

describe('resolveThemeBasis', () => {
  it('uses the default artboard when a theme declares no basis', () => {
    expect(resolveThemeBasis(undefined, undefined, '3:4')).toEqual(DEFAULT_THEME_BASIS);
  });

  it('keeps the authored basis on every portrait and square format', () => {
    for (const ratio of ['1:1', '4:5', '3:4', '9:16', 'auto'] as const) {
      expect(resolveThemeBasis(undefined, 480, ratio))
        .withContext(ratio)
        .toEqual(DEFAULT_THEME_BASIS);
    }
  });

  it('swaps in the shorter landscape height on the 1.91:1 format', () => {
    expect(resolveThemeBasis(undefined, 480, '1.91:1')).toEqual({
      width: THEME_DESIGN_WIDTH,
      height: 480,
    });
  });

  it('keeps the authored basis on 1.91:1 when a theme declares no landscape height', () => {
    // Themes whose content collides the moment they shrink opt out by omission.
    expect(resolveThemeBasis(undefined, undefined, '1.91:1')).toEqual(DEFAULT_THEME_BASIS);
  });

  it('applies the landscape height against the theme\'s own authored basis', () => {
    const authored = { width: 480, height: 640 };
    expect(resolveThemeBasis(authored, 570, '1.91:1')).toEqual({ width: 480, height: 570 });
  });

  it('never lets a landscape height stretch the artboard taller than authored', () => {
    expect(resolveThemeBasis(undefined, 900, '1.91:1')).toEqual(DEFAULT_THEME_BASIS);
  });

  it('renders a landscape theme larger than the authored artboard would', () => {
    // The point of the landscape height: a shorter canvas means a larger scale
    // onto the same card width, so the theme's type exports bigger.
    const cardWidth = 540;
    const aspect = 1080 / 566;
    const authored = computeThemeCanvas(cardWidth, aspect, DEFAULT_THEME_BASIS);
    const landscape = computeThemeCanvas(cardWidth, aspect, resolveThemeBasis(undefined, 480, '1.91:1'));

    expect(landscape.height).toBe(480);
    expect(landscape.scale).toBeGreaterThan(authored.scale);
  });
});
