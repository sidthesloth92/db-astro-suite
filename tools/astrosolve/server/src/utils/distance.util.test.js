import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LY_PER_PARSEC,
  parsecsToLy,
  kiloparsecsToLy,
  megaparsecsToLy,
  measurementToLy,
  parallaxToLy,
  distanceModulusToLy,
  redshiftVelocityToLy,
} from "./distance.util.js";

const approx = (actual, expected, tol = 0.5) =>
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `expected ~${expected}, got ${actual}`,
  );

describe("parsecsToLy", () => {
  it("converts parsecs to light-years", () => {
    approx(parsecsToLy(1), LY_PER_PARSEC, 1e-6);
    approx(parsecsToLy(10), 32.6156, 1e-3);
  });
  it("returns null for missing or non-positive input", () => {
    assert.equal(parsecsToLy(null), null);
    assert.equal(parsecsToLy(0), null);
    assert.equal(parsecsToLy(-5), null);
    assert.equal(parsecsToLy(Number.NaN), null);
  });
});

describe("kiloparsecsToLy", () => {
  it("converts kiloparsecs to light-years (M 13 ≈ 7.4 kpc ⇒ ~24,135 ly)", () => {
    approx(kiloparsecsToLy(7.4), 24135.5, 1);
  });
  it("returns null for missing or non-positive input", () => {
    assert.equal(kiloparsecsToLy(null), null);
    assert.equal(kiloparsecsToLy(0), null);
  });
});

describe("megaparsecsToLy + measurementToLy (SIMBAD mesDistance units)", () => {
  it("converts Mpc to light-years (M 81 ≈ 3.6 Mpc ⇒ ~11.7 Mly)", () => {
    approx(megaparsecsToLy(3.6), 11_741_616, 1000);
  });
  it("dispatches by unit string (case-insensitive)", () => {
    approx(measurementToLy(433, "pc"), 1412.3, 1); // Orion via parallax
    approx(measurementToLy(8, "kpc"), 26092.5, 5); // M 13
    approx(measurementToLy(3.6, "Mpc"), 11_741_616, 1000);
    assert.equal(measurementToLy(5, "ly"), null); // unknown unit
    assert.equal(measurementToLy(0, "pc"), null);
  });
});

describe("parallaxToLy", () => {
  it("converts a positive parallax (mas) to light-years", () => {
    // 7.5 mas ⇒ 133.3 pc ⇒ ~434.9 ly
    approx(parallaxToLy(7.5), 434.9, 0.5);
    // 1 mas ⇒ 1000 pc ⇒ 3261.56 ly
    approx(parallaxToLy(1), 3261.56, 0.1);
  });
  it("returns null for zero/negative/invalid parallax", () => {
    assert.equal(parallaxToLy(0), null);
    assert.equal(parallaxToLy(-2), null);
    assert.equal(parallaxToLy(null), null);
    assert.equal(parallaxToLy(Number.NaN), null);
  });
});

describe("distanceModulusToLy", () => {
  it("converts a distance modulus to light-years", () => {
    // μ = 0 ⇒ 10 pc ⇒ 32.6156 ly
    approx(distanceModulusToLy(0), 32.6156, 1e-3);
    // μ = 30 ⇒ 10^7 pc = 10 Mpc ⇒ ~32.6 Mly
    approx(distanceModulusToLy(30), 32_615_600, 100);
  });
  it("returns null for a missing/invalid modulus", () => {
    assert.equal(distanceModulusToLy(null), null);
    assert.equal(distanceModulusToLy(Number.NaN), null);
  });
});

describe("redshiftVelocityToLy", () => {
  it("converts recession velocity to a Hubble distance (cz=7000 ⇒ 100 Mpc ⇒ ~326 Mly)", () => {
    approx(redshiftVelocityToLy(7000), 326_156_000, 1000);
  });
  it("returns null for zero/negative velocity (nearby galaxies)", () => {
    assert.equal(redshiftVelocityToLy(0), null);
    assert.equal(redshiftVelocityToLy(-300), null); // e.g. M 31 blueshift
    assert.equal(redshiftVelocityToLy(null), null);
  });
});
