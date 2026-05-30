import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankDesignation } from "./designation-rank.util.js";

describe("rankDesignation", () => {
  it("ranks canonical DSO designations above survey/anonymous ones", () => {
    const m81 = rankDesignation("M 81", "M");
    const ngc = rankDesignation("NGC 3031", "NGC/IC");
    const pgc = rankDesignation("PGC 28630", "PGC");
    const survey = rankDesignation("[JCF89] 80", undefined);

    assert.ok(m81 > ngc, "M should outrank NGC");
    assert.ok(ngc > pgc, "NGC should outrank PGC");
    assert.ok(pgc > survey, "PGC should outrank a bracketed survey id");
  });

  it("recognises canonical names even when the catalog tag is missing", () => {
    // The bug: coincident M 81 arrives without a recognised 'M' tag, so a
    // tag-only sort buried it below 'PGC'. Name-pattern ranking fixes that.
    assert.ok(
      rankDesignation("M 81", undefined) > rankDesignation("PGC 28630", "PGC"),
      "untagged 'M 81' must still beat a tagged PGC id",
    );
  });

  it("pushes transient and survey designations below zero", () => {
    assert.ok(rankDesignation("M81N 2006-02b", undefined) < 0, "nova");
    assert.ok(rankDesignation("PNV J09553556+6904271", undefined) < 0, "possible nova");
    assert.ok(rankDesignation("SN 2011fe", undefined) < 0, "supernova");
    assert.ok(rankDesignation("[NS2004] 4", undefined) < 0, "bracketed survey id");
  });

  it("does not mistake supernova remnants or planetary nebulae for transients", () => {
    assert.ok(rankDesignation("SNR G180.0-01.7", undefined) >= 0, "SNR is not a transient");
  });

  it("ranks proper names highest via the Named catalog tag", () => {
    const sirius = rankDesignation("Sirius", "Named");
    assert.ok(sirius > rankDesignation("HD 48915", "HIP"));
    assert.ok(sirius > rankDesignation("Gaia DR3 2947...", "Gaia"));
  });

  it("orders Messier ahead of NGC ahead of IC", () => {
    assert.ok(rankDesignation("M 1", "M") > rankDesignation("NGC 1952", "NGC/IC"));
    assert.ok(rankDesignation("NGC 1952", "NGC/IC") > rankDesignation("IC 405", undefined));
  });

  it("ranks human-readable star catalogues (HD/HIP/BD) above anonymous surveys (Gaia/TYC)", () => {
    const gaia = rankDesignation("Gaia DR3 3131989146947109248", "Gaia");
    const tyc = rankDesignation("TYC  158-1354-1", "TYC");
    for (const named of ["HR 1948", "HD 46105A", "HIP 26764", "BD+05  1342", "SAO 113271"]) {
      assert.ok(rankDesignation(named, undefined) > gaia, `${named} > Gaia`);
      assert.ok(rankDesignation(named, undefined) > tyc, `${named} > TYC`);
    }
  });
});
