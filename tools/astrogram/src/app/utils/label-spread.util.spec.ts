import { spreadLabels, staggerLabels } from './label-spread.util';

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

describe('staggerLabels', () => {
  // Planet centres of a 7-filter System Line card, bunched towards the end.
  const crowded = [85, 205, 325, 384, 413, 426, 440];

  it('should keep labels in one row on their anchors when they are far enough apart', () => {
    expect(staggerLabels([164, 332, 416], 62, 30, 446)).toEqual([
      { x: 164, isSecondRow: false },
      { x: 332, isSecondRow: false },
      { x: 416, isSecondRow: false },
    ]);
  });

  it('should alternate rows when one row would slide labels off their anchors', () => {
    const out = staggerLabels(crowded, 62, 30, 446);

    expect(out.map((l) => l.isSecondRow)).toEqual([false, true, false, true, false, true, false]);
  });

  it('should keep labels closer to their anchors than a single spread row does', () => {
    const worst = (xs: number[]): number => Math.max(...xs.map((x, i) => Math.abs(x - crowded[i])));

    expect(worst(staggerLabels(crowded, 62, 30, 446).map((l) => l.x))).toBeLessThan(
      worst(spreadLabels(crowded, 62, 30, 446)),
    );
  });

  it('should keep the minimum gap between labels that share a row', () => {
    const out = staggerLabels(crowded, 62, 30, 446);

    out.slice(2).forEach((l, i) => expect(l.x - out[i].x).toBeGreaterThanOrEqual(62 - 1e-9));
  });

  it('should return nothing for no labels', () => {
    expect(staggerLabels([], 62, 30, 446)).toEqual([]);
  });
});
