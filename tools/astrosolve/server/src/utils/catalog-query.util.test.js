import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  starMagnitudeCutoff,
  decBounds,
  raDelta,
  raRanges,
  raSeparationDeg,
} from "./catalog-query.util.js";

describe("starMagnitudeCutoff", () => {
  it("returns the faint cutoff for a narrow field", () => {
    assert.equal(starMagnitudeCutoff(0.3), 15);
  });
  it("keeps faint stars for a medium field (deep-field case)", () => {
    assert.equal(starMagnitudeCutoff(2), 15);
  });
  it("trims to moderately faint stars for a wide field", () => {
    assert.equal(starMagnitudeCutoff(10), 12);
  });
  it("uses the wide catch-all for a non-finite radius", () => {
    assert.equal(starMagnitudeCutoff(Number.POSITIVE_INFINITY), 12);
  });
});

describe("decBounds", () => {
  it("returns dec ± radius", () => {
    assert.deepEqual(decBounds(40, 2), { minDec: 38, maxDec: 42 });
  });
  it("clamps to the poles", () => {
    const { minDec, maxDec } = decBounds(89, 5);
    assert.equal(maxDec, 90);
    assert.equal(minDec, 84);
  });
});

describe("raDelta", () => {
  it("equals the radius at the equator", () => {
    assert.ok(Math.abs(raDelta(0, 2) - 2) < 1e-9);
  });
  it("widens toward the poles", () => {
    assert.ok(raDelta(60, 2) > 2);
  });
});

describe("raRanges", () => {
  it("returns a single range away from the seam", () => {
    const ranges = raRanges(180, 0, 2);
    assert.equal(ranges.length, 1);
    assert.ok(Math.abs(ranges[0].minRA - 178) < 1e-9);
    assert.ok(Math.abs(ranges[0].maxRA - 182) < 1e-9);
  });

  it("splits into two ranges when wrapping below 0", () => {
    const ranges = raRanges(1, 0, 3);
    assert.equal(ranges.length, 2);
    // [0, 4] and [358, 360]
    assert.ok(ranges.some((r) => r.minRA === 0 && Math.abs(r.maxRA - 4) < 1e-9));
    assert.ok(ranges.some((r) => Math.abs(r.minRA - 358) < 1e-9 && r.maxRA === 360));
  });

  it("splits into two ranges when wrapping above 360", () => {
    const ranges = raRanges(359, 0, 3);
    assert.equal(ranges.length, 2);
    assert.ok(ranges.some((r) => Math.abs(r.minRA - 356) < 1e-9 && r.maxRA === 360));
    assert.ok(ranges.some((r) => r.minRA === 0 && Math.abs(r.maxRA - 2) < 1e-9));
  });

  it("returns the whole RA circle for a very wide / polar field", () => {
    const ranges = raRanges(100, 89, 10);
    assert.deepEqual(ranges, [{ minRA: 0, maxRA: 360 }]);
  });
});

describe("raSeparationDeg", () => {
  it("is symmetric and zero for equal RAs", () => {
    assert.equal(raSeparationDeg(100, 100), 0);
  });
  it("measures across the seam", () => {
    assert.equal(raSeparationDeg(359, 1), 2);
    assert.equal(raSeparationDeg(1, 359), 2);
  });
  it("never exceeds 180", () => {
    assert.equal(raSeparationDeg(0, 270), 90);
  });
});
