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

  it("treats the local zero-padded form and SIMBAD's spaced form as one designation", () => {
    // OpenNGC stores "IC0063" / "NGC0224"; SIMBAD returns "IC 63" / "NGC 224".
    assert.equal(normalizeName("IC0063"), normalizeName("IC 63"));
    assert.equal(normalizeName("NGC0224"), normalizeName("NGC 224"));
    assert.equal(normalizeName("M081"), normalizeName("M 81"));
  });

  it("strips only run-leading zeros, so distinct long survey IDs stay distinct", () => {
    // Internal digits are preserved (no Number() round-trip), so two different
    // Gaia identifiers never collapse to the same normalised form.
    assert.notEqual(
      normalizeName("Gaia DR3 1000000000000000001"),
      normalizeName("Gaia DR3 1000000000000000002"),
    );
  });
});

describe("formatDesignation", () => {
  const cases = [
    ["NGC3031", "NGC 3031"],
    ["M81", "M 81"],
    ["M  81", "M 81"],
    ["HD  46105A", "HD 46105A"],
    ["NGC 3031", "NGC 3031"],
    // Local catalogue zero-padding is dropped for display.
    ["IC0063", "IC 63"],
    ["IC 0063", "IC 63"],
    ["NGC0224", "NGC 224"],
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
