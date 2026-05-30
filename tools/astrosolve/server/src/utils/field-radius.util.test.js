import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fieldRadiusDeg } from "./field-radius.util.js";

describe("fieldRadiusDeg", () => {
  it("returns the half-diagonal in degrees for a typical field", () => {
    // 46.07 x 57.59 arcmin → diagonal ≈ 73.76 arcmin → half ≈ 36.88 arcmin ≈ 0.6147°
    const radius = fieldRadiusDeg(46.0677, 57.5913);
    assert.ok(Math.abs(radius - 0.6147) < 0.001, `got ${radius}`);
  });

  it("scales up for a wide field (small focal length)", () => {
    // ~10° x ~7° field → half-diagonal ≈ 6.1°
    const radius = fieldRadiusDeg(600, 420);
    assert.ok(radius > 6 && radius < 6.2, `got ${radius}`);
  });

  it("scales down for a narrow field (long focal length)", () => {
    // ~10 x 7 arcmin → half-diagonal ≈ 0.1018° (above the 0.1 floor)
    const radius = fieldRadiusDeg(10, 7);
    assert.ok(radius > 0.1 && radius < 0.12, `got ${radius}`);
  });

  it("clamps to the 0.1° floor for a tiny field", () => {
    assert.equal(fieldRadiusDeg(1, 1), 0.1);
  });

  it("clamps to the 18° ceiling for an absurdly large field", () => {
    assert.equal(fieldRadiusDeg(5000, 5000), 18);
  });

  it("returns the default fallback when both dimensions are missing", () => {
    assert.equal(fieldRadiusDeg(null, null), 2.0);
    assert.equal(fieldRadiusDeg(undefined, undefined), 2.0);
  });

  it("returns the default fallback when a dimension is non-positive or non-finite", () => {
    assert.equal(fieldRadiusDeg(0, 50), 2.0);
    assert.equal(fieldRadiusDeg(50, -3), 2.0);
    assert.equal(fieldRadiusDeg(Number.NaN, 50), 2.0);
  });

  it("honors and clamps a custom fallback", () => {
    assert.equal(fieldRadiusDeg(null, null, 5), 5);
    assert.equal(fieldRadiusDeg(null, null, 99), 18);
    assert.equal(fieldRadiusDeg(null, null, 0), 0.1);
  });
});
