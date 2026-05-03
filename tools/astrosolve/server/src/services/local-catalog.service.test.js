import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findObjectsInRadius } from "./local-catalog.service.js";

/** Minimal logger stub accepted by findObjectsInRadius. */
const log = { info: () => {}, warn: () => {}, error: () => {} };

/**
 * Builds a minimal LocalCatalogDao stub whose queryObjectsByBoundingBox
 * returns a fixed list of raw DB rows.
 *
 * @param {Array<Object>} rows - Raw rows to return from the bounding-box query
 * @returns {{ queryObjectsByBoundingBox: Function }}
 */
function makeDao(rows) {
  return {
    queryObjectsByBoundingBox: () => rows,
  };
}

describe("findObjectsInRadius", () => {
  it("returns [] when localCatalogDao is null", () => {
    const result = findObjectsInRadius(null, {
      ra: 10,
      dec: 40,
      radiusDeg: 2,
      log,
    });
    assert.deepEqual(result, []);
  });

  it("returns [] when localCatalogDao is undefined", () => {
    const result = findObjectsInRadius(undefined, {
      ra: 10,
      dec: 40,
      radiusDeg: 2,
      log,
    });
    assert.deepEqual(result, []);
  });

  it("returns only objects that fall inside the conical radius", () => {
    // Object exactly at the search center — must be included.
    const inside = { name: "NGC0224", type: "G", ra: 10, dec: 40, magnitude: 4, sizeArcmin: 190 };
    // Object 3 degrees away in RA (well outside the 2-degree radius) — must be excluded.
    const outside = { name: "NGC0000", type: "G", ra: 13, dec: 40, magnitude: 5, sizeArcmin: null };

    const dao = makeDao([inside, outside]);
    const result = findObjectsInRadius(dao, {
      ra: 10,
      dec: 40,
      radiusDeg: 2,
      log,
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].name, "NGC 224");
    assert.equal(result[0].source, "local");
  });

  it("normalises OpenNGC identifiers: removes leading zeros (IC0434 → IC 434)", () => {
    const row = { name: "IC0434", type: "HII", ra: 83.8, dec: -2.5, magnitude: null, sizeArcmin: 60 };
    const dao = makeDao([row]);
    const result = findObjectsInRadius(dao, {
      ra: 83.8,
      dec: -2.5,
      radiusDeg: 1,
      log,
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].name, "IC 434");
  });

  it("normalises OpenNGC identifiers: removes leading zeros (NGC2023 → NGC 2023)", () => {
    const row = { name: "NGC2023", type: "RNe", ra: 83.8, dec: -2.26, magnitude: null, sizeArcmin: 10 };
    const dao = makeDao([row]);
    const result = findObjectsInRadius(dao, {
      ra: 83.8,
      dec: -2.26,
      radiusDeg: 1,
      log,
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].name, "NGC 2023");
  });

  it("preserves names that do not match the OpenNGC pattern unchanged", () => {
    const row = { name: "Sirius", type: "*", ra: 101.3, dec: -16.7, magnitude: -1.46, sizeArcmin: null };
    const dao = makeDao([row]);
    const result = findObjectsInRadius(dao, {
      ra: 101.3,
      dec: -16.7,
      radiusDeg: 1,
      log,
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].name, "Sirius");
  });

  it("adds source: 'local' to every returned object", () => {
    const row = { name: "NGC 5128", type: "G", ra: 201.37, dec: -43.02, magnitude: 6.84, sizeArcmin: 20 };
    const dao = makeDao([row]);
    const result = findObjectsInRadius(dao, {
      ra: 201.37,
      dec: -43.02,
      radiusDeg: 1,
      log,
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].source, "local");
  });
});
