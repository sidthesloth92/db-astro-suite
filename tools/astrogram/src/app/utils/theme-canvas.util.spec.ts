import { THEME_DESIGN_HEIGHT, THEME_DESIGN_WIDTH } from '../constants/theme-canvas.constants';
import { DEFAULT_THEME_BASIS, computeThemeCanvas } from './theme-canvas.util';

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
