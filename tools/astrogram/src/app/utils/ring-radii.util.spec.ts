import { ringRadii } from './ring-radii.util';

describe('ringRadii', () => {
  it('should keep the authored start and spacing when the rings fit', () => {
    expect(ringRadii(3, 96, 34, 170, 72)).toEqual([96, 130, 164]);
  });

  it('should pull the rings inward, keeping their spacing, while there is room', () => {
    expect(ringRadii(4, 96, 34, 200, 40)).toEqual([96, 130, 164, 198]);
    expect(ringRadii(4, 96, 34, 170, 40)).toEqual([68, 102, 136, 170]);
  });

  it('should tighten the spacing once the innermost ring reaches its limit', () => {
    const radii = ringRadii(4, 96, 34, 170, 72);

    expect(radii[0]).toBeCloseTo(72);
    expect(radii[3]).toBeCloseTo(170);
    expect(radii[1] - radii[0]).toBeLessThan(34);
  });

  it('should fit every band inside the outer radius, however many there are', () => {
    const radii = ringRadii(7, 96, 34, 170, 72);

    expect(radii.length).toBe(7);
    expect(radii[0]).toBeCloseTo(72);
    expect(radii[6]).toBeCloseTo(170);
    radii.slice(1).forEach((r, i) => expect(r).toBeGreaterThan(radii[i]));
  });

  it('should place a single ring at the preferred radius', () => {
    expect(ringRadii(1, 96, 34, 170, 72)).toEqual([96]);
  });

  it('should return nothing for no bands', () => {
    expect(ringRadii(0, 96, 34, 170, 72)).toEqual([]);
  });
});
