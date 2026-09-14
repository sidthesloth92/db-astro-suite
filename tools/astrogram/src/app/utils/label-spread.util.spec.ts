import { spreadLabels } from './label-spread.util';

describe('spreadLabels', () => {
  it('should leave labels that are already far enough apart on their anchors', () => {
    expect(spreadLabels([100, 250, 400], 62, 30, 446)).toEqual([100, 250, 400]);
  });

  it('should push crowded labels apart to the minimum gap', () => {
    const out = spreadLabels([300, 310, 320], 62, 30, 446);

    expect(out[1] - out[0]).toBeGreaterThanOrEqual(62);
    expect(out[2] - out[1]).toBeGreaterThanOrEqual(62);
  });

  it('should pull labels back inside the range when pushing ran past the end', () => {
    const out = spreadLabels([400, 420, 440, 445], 62, 30, 446);

    expect(out[out.length - 1]).toBeLessThanOrEqual(446);
    out.slice(1).forEach((x, i) => expect(x - out[i]).toBeGreaterThanOrEqual(62 - 1e-9));
  });

  it('should shrink the gap rather than leave the range when too many labels are crowded', () => {
    const out = spreadLabels([440, 441, 442, 443, 444, 445, 446, 446], 62, 30, 446);

    expect(out[0]).toBeGreaterThanOrEqual(30);
    expect(out[out.length - 1]).toBeLessThanOrEqual(446);
    out.slice(1).forEach((x, i) => expect(x).toBeGreaterThan(out[i]));
  });

  it('should return nothing for no labels', () => {
    expect(spreadLabels([], 62, 30, 446)).toEqual([]);
  });
});
