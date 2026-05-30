import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { SqliteLocalCatalogDao } from "./sqlite-local-catalog.dao.js";
import {
  DSO_RESULT_CAP,
  STAR_RESULT_CAP,
} from "../constants/catalog.constants.js";

/**
 * Creates an in-memory catalog DB seeded with the given rows. When
 * `withRtree` is true, an `objects_rtree` virtual table is created and
 * populated so the DAO exercises its spatial-index path; otherwise it falls
 * back to the bounded range scan. Both must return the same rows.
 *
 * @param {Array<Object>} rows
 * @param {boolean} withRtree
 * @returns {SqliteLocalCatalogDao}
 */
function makeDao(rows, withRtree) {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE objects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catalog TEXT, entryId TEXT, name TEXT, commonName TEXT, type TEXT,
      ra REAL, dec REAL, magnitude REAL, sizeArcmin REAL
    );
  `);
  const insert = db.prepare(`
    INSERT INTO objects (catalog, entryId, name, commonName, type, ra, dec, magnitude, sizeArcmin)
    VALUES (@catalog, @entryId, @name, @commonName, @type, @ra, @dec, @magnitude, @sizeArcmin)
  `);
  const insertMany = db.transaction((items) => {
    for (const r of items) {
      insert.run({
        catalog: r.catalog ?? null,
        entryId: r.entryId ?? r.name,
        name: r.name,
        commonName: r.commonName ?? null,
        type: r.type,
        ra: r.ra,
        dec: r.dec,
        magnitude: r.magnitude ?? null,
        sizeArcmin: r.sizeArcmin ?? null,
      });
    }
  });
  insertMany(rows);

  if (withRtree) {
    db.exec(`
      CREATE VIRTUAL TABLE objects_rtree USING rtree(id, minRA, maxRA, minDec, maxDec);
      INSERT INTO objects_rtree (id, minRA, maxRA, minDec, maxDec)
        SELECT id, ra, ra, dec, dec FROM objects;
    `);
  }
  return new SqliteLocalCatalogDao(db);
}

// Run the whole contract against both schema variants.
for (const withRtree of [false, true]) {
  const label = withRtree ? "with R-tree index" : "with range-scan fallback";

  describe(`SqliteLocalCatalogDao.queryObjectsInRegion (${label})`, () => {
    it("returns DSOs and bright stars inside the box", () => {
      const dao = makeDao(
        [
          { name: "NGC 224", type: "G", ra: 10.0, dec: 41.0, magnitude: 3.4, sizeArcmin: 190 },
          { catalog: "Named", name: "BrightStar", type: "Star", ra: 10.1, dec: 41.1, magnitude: 2.0 },
        ],
        withRtree,
      );
      const rows = dao.queryObjectsInRegion({ ra: 10, dec: 41, radiusDeg: 1 });
      const names = rows.map((r) => r.name).sort();
      assert.deepEqual(names, ["BrightStar", "NGC 224"]);
    });

    it("excludes objects outside the bounding box", () => {
      const dao = makeDao(
        [
          { name: "Inside", type: "G", ra: 10, dec: 0, magnitude: 5 },
          { name: "FarAway", type: "G", ra: 200, dec: 0, magnitude: 5 },
        ],
        withRtree,
      );
      const rows = dao.queryObjectsInRegion({ ra: 10, dec: 0, radiusDeg: 1 });
      assert.deepEqual(rows.map((r) => r.name), ["Inside"]);
    });

    it("drops stars fainter than the field-size cutoff but keeps faint DSOs", () => {
      const dao = makeDao(
        [
          // Wide field (radius 5° → star cutoff 12). A mag-14 star is dropped…
          { name: "FaintStar", type: "Star", ra: 10, dec: 0, magnitude: 14 },
          { name: "BrightStar", type: "Star", ra: 10, dec: 0, magnitude: 4 },
          // …but a mag-14 galaxy is always kept (DSOs are never mag-filtered).
          { name: "FaintGalaxy", type: "G", ra: 10, dec: 0, magnitude: 14 },
        ],
        withRtree,
      );
      const rows = dao.queryObjectsInRegion({ ra: 10, dec: 0, radiusDeg: 5 });
      const names = rows.map((r) => r.name).sort();
      assert.deepEqual(names, ["BrightStar", "FaintGalaxy"]);
    });

    it("returns stars brightest-first and applies the star cap", () => {
      const stars = [];
      for (let i = 0; i < STAR_RESULT_CAP + 50; i++) {
        // Narrow field cutoff is 15; keep all under it. Magnitudes ascend.
        stars.push({ name: `S${i}`, type: "Star", ra: 10, dec: 0, magnitude: 1 + i * 0.001 });
      }
      const dao = makeDao(stars, withRtree);
      const rows = dao.queryObjectsInRegion({ ra: 10, dec: 0, radiusDeg: 0.2 });
      assert.equal(rows.length, STAR_RESULT_CAP);
      // Brightest retained, faintest-over-cap dropped.
      const mags = rows.map((r) => r.magnitude);
      assert.equal(Math.min(...mags), 1);
      assert.ok(Math.max(...mags) < 1 + STAR_RESULT_CAP * 0.001);
    });

    it("handles RA wraparound at the 0/360° seam", () => {
      const dao = makeDao(
        [
          { name: "SeamLeft", type: "G", ra: 359, dec: 0, magnitude: 5 },
          { name: "SeamRight", type: "G", ra: 1, dec: 0, magnitude: 5 },
          { name: "Opposite", type: "G", ra: 180, dec: 0, magnitude: 5 },
        ],
        withRtree,
      );
      const rows = dao.queryObjectsInRegion({ ra: 0, dec: 0, radiusDeg: 2 });
      const names = rows.map((r) => r.name).sort();
      assert.deepEqual(names, ["SeamLeft", "SeamRight"]);
    });

    it("does not double-count a star when 'Star' is passed in types", () => {
      // A star matches the star tier; the DSO tier must strip 'Star' so the
      // row is not also pulled in there and returned twice.
      const dao = makeDao(
        [{ catalog: "Named", name: "X", type: "Star", ra: 10, dec: 0, magnitude: 3 }],
        withRtree,
      );
      const rows = dao.queryObjectsInRegion({ ra: 10, dec: 0, radiusDeg: 1, types: ["Star"] });
      assert.equal(rows.length, 1);
    });

    it("includes an explicitly requested DSO type via the types extension", () => {
      const dao = makeDao(
        [{ catalog: "MyCat", name: "Custom", type: "WeirdType", ra: 10, dec: 0, magnitude: 9 }],
        withRtree,
      );
      // 'WeirdType' is non-'Star' so it is already a DSO; confirm it is returned.
      const rows = dao.queryObjectsInRegion({ ra: 10, dec: 0, radiusDeg: 1, types: ["WeirdType"] });
      assert.deepEqual(rows.map((r) => r.name), ["Custom"]);
    });

    it("caps the DSO tier", () => {
      const dsos = [];
      for (let i = 0; i < DSO_RESULT_CAP + 100; i++) {
        dsos.push({ name: `G${i}`, type: "G", ra: 10 + (i % 5) * 0.001, dec: 0, magnitude: 12 });
      }
      const dao = makeDao(dsos, withRtree);
      const rows = dao.queryObjectsInRegion({ ra: 10, dec: 0, radiusDeg: 0.5 });
      assert.equal(rows.length, DSO_RESULT_CAP);
    });
  });
}
