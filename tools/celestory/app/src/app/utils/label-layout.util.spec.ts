import { describe, expect, it } from 'vitest';
import { type LabelBox, placeLabel } from './label-layout.util';

describe('label-layout.util', () => {
  it('places the first label where asked and records it', () => {
    const placed: LabelBox[] = [];
    const box = placeLabel(placed, 10, 10, 50, 14);
    expect(box).toEqual({ x: 10, y: 10, w: 50, h: 14 });
    expect(placed).toHaveLength(1);
  });

  it('nudges a colliding label to a free slot', () => {
    const placed: LabelBox[] = [];
    placeLabel(placed, 10, 10, 50, 14);
    const second = placeLabel(placed, 12, 12, 50, 14);
    expect(second).not.toBeNull();
    expect(second!.y).not.toBe(12);
    expect(placed).toHaveLength(2);
  });

  it('gives up when every candidate slot is taken', () => {
    const placed: LabelBox[] = [{ x: -100, y: -100, w: 400, h: 400 }];
    expect(placeLabel(placed, 10, 10, 50, 14)).toBeNull();
    expect(placed).toHaveLength(1);
  });
});
