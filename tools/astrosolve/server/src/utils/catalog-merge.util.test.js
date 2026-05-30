import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeObjects } from "./catalog-merge.util.js";
import { CatalogObject } from "../models/solve.model.js";

/**
 * Builds a local star CatalogObject at a position.
 * @param {string} catalog
 * @param {string} name
 * @param {number} ra
 * @param {number} dec
 * @param {number} mag
 */
function star(catalog, name, ra, dec, mag) {
  return new CatalogObject(name, "Star", ra, dec, mag, "local", catalog, name, null, null);
}

describe("mergeObjects — coincident star dedup", () => {
  it("drops the Gaia twin when an HD (HIP) star is at the same position", () => {
    // Gamma Cas: HD 5394 and its Gaia twin <1 arcsec apart.
    const local = [
      star("HIP", "HD 5394", 14.1772155, 60.7167404, 2.15),
      star("Gaia", "Gaia DR3 426558460884582016", 14.177451, 60.7167228, 2.06),
    ];
    const merged = mergeObjects(local, []);
    assert.equal(merged.length, 1, "the coincident pair should collapse to one");
    assert.equal(merged[0].name, "HD 5394", "higher-priority HIP entry wins over Gaia");
  });

  it("prefers a Named entry over both HD and Gaia at the same position", () => {
    const local = [
      star("Gaia", "Gaia DR3 1", 10.0, 20.0, 2.1),
      star("HIP", "HD 100", 10.00005, 20.00005, 2.0),
      star("Named", "Schedar", 10.0001, 20.0001, 1.9),
    ];
    const merged = mergeObjects(local, []);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].name, "Schedar");
  });

  it("keeps two genuinely separate stars that are close but beyond 5 arcsec", () => {
    // ~13 arcsec apart — distinct stars, must both survive.
    const local = [
      star("HIP", "HD 5394", 14.1772, 60.7167, 2.15),
      star("Gaia", "Gaia DR3 faintneighbor", 14.18163, 60.71957, 13.46),
    ];
    const merged = mergeObjects(local, []);
    assert.equal(merged.length, 2);
  });

  it("keeps a lone Gaia field star with no HD/named counterpart", () => {
    const local = [star("Gaia", "Gaia DR3 lonely", 50.0, 10.0, 12.3)];
    const merged = mergeObjects(local, []);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].catalog, "Gaia");
  });
});

describe("mergeObjects — alias + category enrichment", () => {
  it("collects all coincident designations as aliases on the survivor", () => {
    const local = [
      star("HIP", "HD 5394", 14.1772155, 60.7167404, 2.15),
      star("Gaia", "Gaia DR3 426558460884582016", 14.177451, 60.7167228, 2.06),
    ];
    const merged = mergeObjects(local, []);
    assert.equal(merged.length, 1);
    const names = merged[0].aliases.map((a) => a.name).sort();
    assert.deepEqual(names, ["Gaia DR3 426558460884582016", "HD 5394"]);
  });

  it("orders aliases by catalog label priority (Named first)", () => {
    const local = [
      star("Gaia", "Gaia DR3 1", 10.0, 20.0, 2.1),
      star("Named", "Schedar", 10.00005, 20.00005, 1.9),
    ];
    const merged = mergeObjects(local, []);
    assert.equal(merged[0].aliases[0].name, "Schedar");
  });

  it("exposes a human-readable category for the object", () => {
    const galaxy = new CatalogObject("NGC 224", "G", 10.68, 41.27, 3.4, "local", "NGC/IC", "NGC0224", "Andromeda", 190, null, null);
    const merged = mergeObjects([galaxy], []);
    assert.ok(merged[0].categories.includes("Galaxy"));
  });

  it("a lone object still gets a single-entry aliases array", () => {
    const local = [star("Gaia", "Gaia DR3 lonely", 50.0, 10.0, 12.3)];
    const merged = mergeObjects(local, []);
    assert.equal(merged[0].aliases.length, 1);
    assert.equal(merged[0].aliases[0].name, "Gaia DR3 lonely");
  });
});

describe("mergeObjects — groups only the same object", () => {
  const at = (name, type, catalog, ra = 148.888, dec = 69.065) =>
    new CatalogObject(name, type, ra, dec, 8, "local", catalog, name, null, null);

  it("merges cross-catalogue designations of one galaxy into a single marker", () => {
    // M 81's NGC / PGC / UGC rows are different catalogues at the same point →
    // one object. Coincident nova/HII/star are distinct kinds → not merged.
    const inputs = [
      at("PGC 28630", "G", "PGC"),
      at("NGC 3031", "G", "NGC/IC"),
      at("M 81", "G", "M"),
      at("UGC 5318", "G", undefined),
      at("M81N 2006-02b", "No*", undefined), // nova (star bucket)
      at("[JCF89] 80", "HII", undefined), // HII region (nebula bucket)
      at("Gaia DR3 foreground", "*", "Gaia"), // foreground star
    ];

    const merged = mergeObjects(inputs, []);
    const galaxies = merged.filter((m) => (m.categories || []).includes("Galaxy"));
    assert.equal(galaxies.length, 1, "the four galaxy rows collapse to one marker");

    const galaxy = galaxies[0];
    assert.equal(galaxy.name, "M 81", "labelled with the best human-readable designation");
    assert.deepEqual(
      galaxy.aliases.map((a) => a.name).sort(),
      ["M 81", "NGC 3031", "PGC 28630", "UGC 5318"],
      "aliases are exactly the galaxy's own designations",
    );
    assert.deepEqual(galaxy.categories, ["Galaxy"]);
  });

  it("keeps distinct sources of one survey as separate markers", () => {
    // [ZBF2015] NGC6207 41/7/3 share a catalogue key → different objects, even
    // though they sit on top of each other.
    const inputs = [
      at("[ZBF2015] NGC6207 41", "HII", undefined),
      at("[ZBF2015] NGC6207 7", "HII", undefined),
      at("[ZBF2015] NGC6207 3", "HII", undefined),
    ];
    const merged = mergeObjects(inputs, []);
    assert.equal(merged.length, 3, "same-survey distinct sources stay separate");
    for (const m of merged) {
      assert.equal(m.aliases.length, 1, "each keeps only its own designation");
    }
  });

  it("does not merge two different galaxies from the same catalogue", () => {
    const inputs = [
      at("PGC 28630", "G", "PGC"),
      at("PGC 28631", "G", "PGC"), // a different galaxy, coincident
    ];
    const merged = mergeObjects(inputs, []);
    assert.equal(merged.length, 2);
  });

  it("still merges a galaxy's NGC + PGC names that arrive from SIMBAD untagged", () => {
    // SIMBAD entries have no catalog tag; identity must come from the name.
    const simbad = [
      new CatalogObject("NGC 3031", "G", 148.888, 69.065, null, "simbad", undefined, undefined, undefined, null),
      new CatalogObject("PGC 28630", "G", 148.8881, 69.0651, null, "simbad", undefined, undefined, undefined, null),
    ];
    const merged = mergeObjects([], simbad);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].name, "NGC 3031");
  });
});

describe("mergeObjects — real M 81 fragmentation (size-aware radius + spacing)", () => {
  // Local rows for one galaxy whose catalogue centres are 6.33″ apart, plus the
  // sizeless SIMBAD "M  81" (double-spaced) — exactly the live solve. All three
  // must collapse to ONE full-size marker.
  const local = (name, ra, dec, size) =>
    new CatalogObject(name, "G", ra, dec, null, "local", "NGC/IC", name, null, size);

  it("collapses the double-space SIMBAD M 81, NGC 3031 and PGC 28630 into one full-size marker", () => {
    const inputs = [
      local("NGC3031", 148.888208, 69.065306, 21.63),
      local("PGC 28630", 148.892083, 69.066389, 21.38), // 6.33″ from NGC3031
    ];
    const simbad = [
      // SIMBAD main_id is double-spaced and carries no size (the tiny circle).
      new CatalogObject("M  81", "Sy2", 148.88822, 69.0653, null, "simbad", undefined, undefined, undefined, null),
    ];

    const merged = mergeObjects(inputs, simbad);
    const galaxies = merged.filter((m) => (m.categories || []).includes("Galaxy"));
    assert.equal(galaxies.length, 1, "one galaxy marker, not three");

    const g = galaxies[0];
    assert.equal(g.name, "M 81", "single-spaced best name");
    assert.equal(g.sizeArcmin, 21.63, "inherits the real size — not the sizeless SIMBAD row");
    assert.deepEqual(
      g.aliases.map((a) => a.name).sort(),
      ["M 81", "NGC 3031", "PGC 28630"],
      "spaced, deduped designations",
    );
  });

  it("treats `M 81` and `M  81` as the same designation (no duplicate marker)", () => {
    const merged = mergeObjects(
      [new CatalogObject("M 81", "G", 148.888, 69.065, null, "local", "M", "m81", null, 21.63)],
      [new CatalogObject("M  81", "Sy2", 148.888, 69.065, null, "simbad", undefined, undefined, undefined, null)],
    );
    assert.equal(merged.length, 1);
    assert.equal(merged[0].sizeArcmin, 21.63);
  });

  it("does not let a large galaxy swallow a small distinct neighbour 90″ away", () => {
    // Different catalogue (different key) but a genuinely separate small galaxy.
    const big = new CatalogObject("NGC 3031", "G", 148.888, 69.065, null, "local", "NGC/IC", "n", null, 21.63);
    const small = new CatalogObject("PGC 99999", "G", 148.888, 69.065 + 90 / 3600, null, "local", "PGC", "p", null, 1.0);
    const merged = mergeObjects([big, small], []);
    assert.equal(merged.length, 2, "the 1′ galaxy 90″ away stays separate");
  });
});
