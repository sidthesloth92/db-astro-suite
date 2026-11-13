import { rectTouchesDiscs } from './disc-overlap.util';

describe('rectTouchesDiscs', () => {
  // An "6h" axis label under the axis at y 120: x 208-219, y 133.5-141.
  const label = [208, 219, 133.5, 141] as const;

  it('should report a label hidden under a large disc drawn over it', () => {
    expect(rectTouchesDiscs(...label, 120, [{ cx: 205, r: 19.4 }])).toBe(true);
  });

  it('should not report a label that sits just below a small disc', () => {
    expect(rectTouchesDiscs(...label, 120, [{ cx: 213, r: 10.4 }])).toBe(false);
  });

  it('should not report a label beside a disc that ends before it', () => {
    expect(rectTouchesDiscs(...label, 120, [{ cx: 170, r: 24 }])).toBe(false);
  });

  it('should report a label touched by any one of several discs', () => {
    expect(rectTouchesDiscs(...label, 120, [{ cx: 60, r: 10 }, { cx: 225, r: 17 }])).toBe(true);
  });

  it('should not report anything when there are no discs', () => {
    expect(rectTouchesDiscs(...label, 120, [])).toBe(false);
  });
});
