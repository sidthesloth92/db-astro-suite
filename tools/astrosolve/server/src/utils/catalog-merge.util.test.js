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
