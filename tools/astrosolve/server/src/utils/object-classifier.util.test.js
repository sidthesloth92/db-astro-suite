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

  it("classifies the local OpenNGC vocabulary that differs from SIMBAD's", () => {
    // Galaxy groupings/clusters → galaxies
    assert.equal(classifyType("GPair"), "galaxies");
    assert.equal(classifyType("GTrpl"), "galaxies");
    assert.equal(classifyType("GGroup"), "galaxies");
    assert.equal(classifyType("GClus"), "galaxies");
    // Nebula variants the SIMBAD-only list missed
    assert.equal(classifyType("Neb"), "nebulae");
    assert.equal(classifyType("RfN"), "nebulae");
    assert.equal(classifyType("EmN"), "nebulae");
    assert.equal(classifyType("Nova"), "nebulae");
    // Cluster variants (OpenNGC spells these OCl/GCl/Cl+N vs SIMBAD OpC/GlC)
    assert.equal(classifyType("OCl"), "clusters");
    assert.equal(classifyType("GCl"), "clusters");
    assert.equal(classifyType("Cl+N"), "clusters");
  });

  it("matches type codes case-insensitively so source casing never splits buckets", () => {
    assert.equal(classifyType("hii"), "nebulae");
    assert.equal(classifyType("HII"), "nebulae");
    assert.equal(classifyType("emn"), "nebulae");
    assert.equal(classifyType("gpair"), "galaxies");
    assert.equal(classifyType("ocl"), "clusters");
  });

  it("falls back to 'other' for unknown, duplicate, or empty codes", () => {
    assert.equal(classifyType("???"), "other");
    assert.equal(classifyType("Dup"), "other");
    assert.equal(classifyType("NonEx"), "other");
    assert.equal(classifyType(""), "other");
    assert.equal(classifyType(null), "other");
    assert.equal(classifyType(undefined), "other");
  });

  it("exposes quasars as a canonical bucket", () => {
    assert.ok(OBJECT_BUCKETS.includes("quasars"));
  });
});
