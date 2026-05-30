import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyType, OBJECT_BUCKETS } from "./object-classifier.util.js";

describe("classifyType", () => {
  it("classifies star codes and the local 'Star' literal as stars", () => {
    assert.equal(classifyType("*"), "stars");
    assert.equal(classifyType("WD*"), "stars");
    assert.equal(classifyType("Star"), "stars");
  });

  it("classifies ordinary galaxy codes as galaxies", () => {
    assert.equal(classifyType("G"), "galaxies");
    assert.equal(classifyType("EmG"), "galaxies");
    assert.equal(classifyType("Sy1"), "galaxies");
  });

  it("classifies QSO, blazar, and AGN codes as quasars", () => {
    assert.equal(classifyType("QSO"), "quasars");
    assert.equal(classifyType("Bla"), "quasars");
    assert.equal(classifyType("AGN"), "quasars");
  });

  it("classifies nebula and cluster codes into their buckets", () => {
    assert.equal(classifyType("PN"), "nebulae");
    assert.equal(classifyType("HII"), "nebulae");
    assert.equal(classifyType("OpC"), "clusters");
    assert.equal(classifyType("GlC"), "clusters");
  });

  it("falls back to 'other' for unknown or empty codes", () => {
    assert.equal(classifyType("???"), "other");
    assert.equal(classifyType(""), "other");
    assert.equal(classifyType(null), "other");
    assert.equal(classifyType(undefined), "other");
  });

  it("exposes quasars as a canonical bucket", () => {
    assert.ok(OBJECT_BUCKETS.includes("quasars"));
  });
});
