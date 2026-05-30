import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  designationKey,
  normalizeName,
  formatDesignation,
} from "./designation-key.util.js";

describe("designationKey", () => {
  const cases = [
    ["M 81", "M"],
    ["M81", "M"],
    ["NGC 3031", "NGC"],
    ["IC 1396", "IC"],
    ["PGC 28630", "PGC"],
    ["UGC 5318", "UGC"],
    ["Gaia DR3 426558460884582016", "GAIA DR3"],
    ["HD 5394", "HD"],
    ["Sh2-155", "SH2"],
    ["[ZBF2015] NGC6207 41", "[ZBF2015] NGC6207"],
    ["[ZBF2015] NGC6207 7", "[ZBF2015] NGC6207"],
    ["M81N 2006-02b", "M81N"],
    ["PNV J09553556+6904271", "PNV"],
    ["Sirius", "SIRIUS"],
  ];

  for (const [name, key] of cases) {
    it(`maps ${JSON.stringify(name)} -> ${JSON.stringify(key)}`, () => {
      assert.equal(designationKey(name), key);
    });
  }

  it("gives the same key to two entries of one survey (distinct objects)", () => {
    assert.equal(
      designationKey("[ZBF2015] NGC6207 41"),
      designationKey("[ZBF2015] NGC6207 7"),
    );
  });

  it("gives different keys to cross-catalogue names of one object", () => {
    const keys = new Set([
      designationKey("NGC 3031"),
      designationKey("PGC 28630"),
      designationKey("M 81"),
    ]);
    assert.equal(keys.size, 3);
  });

  it("returns empty string for empty input", () => {
    assert.equal(designationKey(""), "");
    assert.equal(designationKey(null), "");
  });
});

describe("normalizeName", () => {
  it("treats spacing variants of one designation as equal", () => {
    assert.equal(normalizeName("M 81"), normalizeName("M  81"));
    assert.equal(normalizeName("M 81"), normalizeName("M81"));
    assert.equal(normalizeName("NGC3031"), normalizeName("NGC 3031"));
  });

  it("keeps genuinely different designations distinct", () => {
    assert.notEqual(normalizeName("NGC 3031"), normalizeName("NGC 3034"));
    assert.notEqual(normalizeName("[ZBF2015] NGC6207 41"), normalizeName("[ZBF2015] NGC6207 7"));
  });
});

describe("formatDesignation", () => {
  const cases = [
    ["NGC3031", "NGC 3031"],
    ["M81", "M 81"],
    ["M  81", "M 81"],
    ["HD  46105A", "HD 46105A"],
    ["NGC 3031", "NGC 3031"],
    ["Sh2-155", "Sh2-155"],
    ["2MASS J09553+6904", "2MASS J09553+6904"],
    ["[ZBF2015] NGC6207 41", "[ZBF2015] NGC6207 41"],
  ];
  for (const [input, out] of cases) {
    it(`formats ${JSON.stringify(input)} -> ${JSON.stringify(out)}`, () => {
      assert.equal(formatDesignation(input), out);
    });
  }
});
