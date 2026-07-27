import {
  ARM_SPRITE_HEIGHT,
  ARM_SPRITE_WIDTH,
  GLOW_SPRITE_SIZE,
} from '../constants/render.constants';
import { StarColor } from '../models/detected-star.model';
import {
  armSpriteCacheKey,
  buildArmSprite,
  buildGlowSprite,
  glowSpriteCacheKey,
} from './spike-sprite.util';

const WHITE: StarColor = { r: 255, g: 255, b: 255 };
const ORANGE: StarColor = { r: 255, g: 128, b: 64 };

/** Reads the full RGBA buffer of a sprite canvas. */
function spriteData(sprite: HTMLCanvasElement): Uint8ClampedArray {
  const ctx = sprite.getContext('2d');
  if (ctx === null) {
    throw new Error('2D context unavailable in test');
  }
  return ctx.getImageData(0, 0, sprite.width, sprite.height).data;
}

/** Reads the alpha byte at (x, y) from a sprite RGBA buffer. */
function alphaAt(data: Uint8ClampedArray, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4 + 3];
}

/** Reads the RGB triple at (x, y) from a sprite RGBA buffer. */
function rgbAt(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number] {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

describe('buildArmSprite', () => {
  it('should size the sprite to the arm sprite constants', () => {
    const sprite = buildArmSprite(WHITE, 2.2);
    expect(sprite.width).toBe(ARM_SPRITE_WIDTH);
    expect(sprite.height).toBe(ARM_SPRITE_HEIGHT);
  });

  it('should be near fully opaque at the arm root on the midline', () => {
    const data = spriteData(buildArmSprite(WHITE, 2.2));
    // The vertical profile peaks at y = 31.5, so rows 31 and 32 flank the max.
    expect(alphaAt(data, ARM_SPRITE_WIDTH, 0, 31)).toBeGreaterThanOrEqual(250);
    expect(alphaAt(data, ARM_SPRITE_WIDTH, 0, 32)).toBeGreaterThanOrEqual(250);
  });

  it('should fade to zero at the far end of the arm', () => {
    const data = spriteData(buildArmSprite(WHITE, 2.2));
    expect(alphaAt(data, ARM_SPRITE_WIDTH, ARM_SPRITE_WIDTH - 1, 31)).toBe(0);
    expect(alphaAt(data, ARM_SPRITE_WIDTH, ARM_SPRITE_WIDTH - 1, 32)).toBe(0);
  });

  it('should fall off monotonically along the midline column by column', () => {
    const data = spriteData(buildArmSprite(WHITE, 2.2));
    let previous = alphaAt(data, ARM_SPRITE_WIDTH, 0, 31);
    for (let x = 1; x < ARM_SPRITE_WIDTH; x++) {
      const current = alphaAt(data, ARM_SPRITE_WIDTH, x, 31);
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
    expect(previous).toBeLessThan(alphaAt(data, ARM_SPRITE_WIDTH, 0, 31));
  });

  it('should fade toward the top and bottom sprite edges', () => {
    const data = spriteData(buildArmSprite(WHITE, 2.2));
    const midline = alphaAt(data, ARM_SPRITE_WIDTH, 0, 31);
    expect(alphaAt(data, ARM_SPRITE_WIDTH, 0, 0)).toBeLessThanOrEqual(1);
    expect(alphaAt(data, ARM_SPRITE_WIDTH, 0, ARM_SPRITE_HEIGHT - 1)).toBeLessThanOrEqual(1);
    expect(midline).toBeGreaterThan(alphaAt(data, ARM_SPRITE_WIDTH, 0, 8));
  });

  it('should fall off faster along the arm for a higher falloff gamma', () => {
    const gentle = spriteData(buildArmSprite(WHITE, 1));
    const steep = spriteData(buildArmSprite(WHITE, 3));
    const midX = Math.floor(ARM_SPRITE_WIDTH / 2);
    expect(alphaAt(steep, ARM_SPRITE_WIDTH, midX, 31)).toBeLessThan(
      alphaAt(gentle, ARM_SPRITE_WIDTH, midX, 31),
    );
  });

  it('should tint the arm pixels with the star color', () => {
    const data = spriteData(buildArmSprite(ORANGE, 2.2));
    const [r, g, b] = rgbAt(data, ARM_SPRITE_WIDTH, 0, 31);
    // Premultiplied-alpha round-trip through the canvas may shift by a level.
    expect(Math.abs(r - ORANGE.r)).toBeLessThanOrEqual(2);
    expect(Math.abs(g - ORANGE.g)).toBeLessThanOrEqual(2);
    expect(Math.abs(b - ORANGE.b)).toBeLessThanOrEqual(2);
  });
});

describe('buildGlowSprite', () => {
  it('should size the sprite to the glow sprite constant', () => {
    const sprite = buildGlowSprite(WHITE);
    expect(sprite.width).toBe(GLOW_SPRITE_SIZE);
    expect(sprite.height).toBe(GLOW_SPRITE_SIZE);
  });

  it('should be near fully opaque at the center and ~0 at the edges', () => {
    const data = spriteData(buildGlowSprite(WHITE));
    const center = alphaAt(data, GLOW_SPRITE_SIZE, 31, 31);
    expect(center).toBeGreaterThan(240);
    // Edge midpoints sit ~2 sigma out; corners are far beyond that.
    expect(alphaAt(data, GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE - 1, 31)).toBeLessThan(10);
    expect(alphaAt(data, GLOW_SPRITE_SIZE, 31, GLOW_SPRITE_SIZE - 1)).toBeLessThan(10);
    expect(alphaAt(data, GLOW_SPRITE_SIZE, 0, 0)).toBeLessThanOrEqual(1);
    expect(alphaAt(data, GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE - 1, GLOW_SPRITE_SIZE - 1)).toBeLessThanOrEqual(1);
  });

  it('should tint the glow pixels with the star color', () => {
    const data = spriteData(buildGlowSprite(ORANGE));
    const [r, g, b] = rgbAt(data, GLOW_SPRITE_SIZE, 31, 31);
    expect(Math.abs(r - ORANGE.r)).toBeLessThanOrEqual(2);
    expect(Math.abs(g - ORANGE.g)).toBeLessThanOrEqual(2);
    expect(Math.abs(b - ORANGE.b)).toBeLessThanOrEqual(2);
  });
});

describe('sprite cache keys', () => {
  const base: StarColor = { r: 255, g: 128, b: 10 };
  // Same values with only the low 4 bits of each channel changed.
  const lowBitsChanged: StarColor = { r: 240, g: 143, b: 15 };
  // Green channel changed in its high 4 bits.
  const highBitsChanged: StarColor = { r: 255, g: 64, b: 10 };

  it('should share an arm key for colors differing only in the low 4 bits', () => {
    expect(armSpriteCacheKey(base, 2.2)).toBe(armSpriteCacheKey(lowBitsChanged, 2.2));
  });

  it('should share a glow key for colors differing only in the low 4 bits', () => {
    expect(glowSpriteCacheKey(base)).toBe(glowSpriteCacheKey(lowBitsChanged));
  });

  it('should produce different keys for colors differing in the high bits', () => {
    expect(armSpriteCacheKey(base, 2.2)).not.toBe(armSpriteCacheKey(highBitsChanged, 2.2));
    expect(glowSpriteCacheKey(base)).not.toBe(glowSpriteCacheKey(highBitsChanged));
  });

  it('should include the falloff gamma in the arm key', () => {
    expect(armSpriteCacheKey(base, 2.2)).not.toBe(armSpriteCacheKey(base, 2.6));
  });

  it('should never collide arm and glow keys for the same color', () => {
    expect(armSpriteCacheKey(base, 2.2)).not.toBe(glowSpriteCacheKey(base));
  });
});
