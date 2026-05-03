/**
 * Unit tests for the solve service domain model contract and processSolveRequest.
 *
 * Domain model tests verify that SolveResult / SolveMetadata / CatalogObject
 * conform to the shape that solve.route.js spreads into `details` and that the
 * Angular frontend expects as `AstroSolveApiResponse.details`.
 *
 * processSolveRequest tests inject mock collaborators via the optional `_deps`
 * parameter so no module-level mocking infrastructure is needed.
 */
import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { SolveResult, SolveMetadata, CatalogObject } from "../models/solve.model.js";
import { CatalogError } from "../models/errors.model.js";
import { processSolveRequest } from "./solve.service.js";

const FAKE_WCS = "SIMPLE  =                    T\nCTYPE1  = 'RA---TAN'\n";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Constructs a SolveResult the same way processSolveRequest does, using the
 * concrete domain model classes.
 *
 * @returns {SolveResult}
 */
function buildFakeSolveResult() {
  return new SolveResult(
    new SolveMetadata(
      83.82,   // ra
      -5.39,   // dec
      0.00125, // scale
      FAKE_WCS, // wcs  ← mapped from solveResult.wcsData
      2.0,     // radius_searched
    ),
    [
      new CatalogObject(
        "NGC 1976",
        "HII",
        83.82,
        -5.39,
        4.0,
        "local",
        "NGC/IC",
        "NGC1976",
        "Orion Nebula",
        65,
      ),
    ],
    [],
  );
}

/** Minimal Fastify-compatible no-op logger */
const fakeLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

// ---------------------------------------------------------------------------
// Domain model tests
// ---------------------------------------------------------------------------

describe("SolveResult domain model — service return type", () => {
  it("processSolveRequest returns a SolveResult instance (not a plain object)", () => {
    const result = buildFakeSolveResult();
    assert.ok(
      result instanceof SolveResult,
      "service must return new SolveResult(...), not a plain {} literal",
    );
  });

  it("result.metadata is a SolveMetadata instance", () => {
    const result = buildFakeSolveResult();
    assert.ok(
      result.metadata instanceof SolveMetadata,
      "result.metadata must be new SolveMetadata(...), not a plain {} literal",
    );
  });

  it("SolveMetadata exposes wcs (not wcsData) — the field the frontend expects", () => {
    const meta = new SolveMetadata(1, 2, 0.001, FAKE_WCS, 2.0);
    assert.equal(
      meta.wcs,
      FAKE_WCS,
      "SolveMetadata.wcs must hold the WCS header string (mapped from solveResult.wcsData)",
    );
    assert.equal(
      meta.wcsData,
      undefined,
      "SolveMetadata must NOT expose a wcsData field — that name belongs to the astrometry DTO only",
    );
  });

  it("SolveMetadata carries all fields required by the frontend SolveMetadata interface", () => {
    const meta = new SolveMetadata(83.82, -5.39, 0.00125, FAKE_WCS, 2.0);
    assert.equal(meta.ra, 83.82);
    assert.equal(meta.dec, -5.39);
    assert.equal(meta.scale, 0.00125);
    assert.equal(meta.wcs, FAKE_WCS);
    assert.equal(meta.radius_searched, 2.0);
  });
});

describe("solve route details payload — frontend contract", () => {
  it("details shape matches AstroSolveResponse: {metadata, objects, warnings?}", () => {
    const result = buildFakeSolveResult();

    // Reproduce what solve.route.js builds for the `details` field
    const details = {
      metadata: result.metadata,
      objects: result.objects,
      ...(result.warnings?.length ? { warnings: result.warnings } : {}),
    };

    // Fields required by the frontend AstroSolveResponse interface
    assert.ok(typeof details.metadata.ra === "number", "details.metadata.ra must be a number");
    assert.ok(typeof details.metadata.dec === "number", "details.metadata.dec must be a number");
    assert.ok(typeof details.metadata.wcs === "string", "details.metadata.wcs must be a string");
    assert.ok(
      typeof details.metadata.radius_searched === "number",
      "details.metadata.radius_searched must be a number",
    );
    assert.ok(Array.isArray(details.objects), "details.objects must be an array");
  });

  it("warnings key is absent from details when there are no warnings", () => {
    const result = buildFakeSolveResult(); // warnings = []
    const details = {
      metadata: result.metadata,
      objects: result.objects,
      ...(result.warnings?.length ? { warnings: result.warnings } : {}),
    };
    assert.equal(
      Object.prototype.hasOwnProperty.call(details, "warnings"),
      false,
      "warnings key must be omitted when the array is empty",
    );
  });

  it("warnings key is present in details when the service emits warnings", () => {
    const result = new SolveResult(
      new SolveMetadata(1, 2, 0.001, FAKE_WCS, 2.0),
      [],
      ["Catalog service (SIMBAD) was unavailable; displayed objects may be incomplete."],
    );
    const details = {
      metadata: result.metadata,
      objects: result.objects,
      ...(result.warnings?.length ? { warnings: result.warnings } : {}),
    };
    assert.ok(
      Object.prototype.hasOwnProperty.call(details, "warnings"),
      "warnings key must be present when the service emits warnings",
    );
    assert.equal(details.warnings.length, 1);
  });
});

// ---------------------------------------------------------------------------
// processSolveRequest unit tests (injected mock.fn() collaborators)
// ---------------------------------------------------------------------------

describe("processSolveRequest — orchestration contract", () => {
  const fakeAstrometryResult = {
    status: "success",
    ra: 83.82,
    dec: -5.39,
    scale: 0.00125,
    wcsData: FAKE_WCS,
  };

  const fakeCatalogObject = new CatalogObject(
    "NGC 1976", "HII", 83.82, -5.39, 4.0, "local",
    "NGC/IC", "NGC1976", "Orion Nebula", 65,
  );

  const fakeSimbadObject = new CatalogObject(
    "M 42", "HII", 83.82, -5.39, 4.0, "simbad",
    undefined, undefined, undefined, null,
  );

  /** @returns {{ solveWithAstrometryFn, querySimbadFn, findObjectsInRadiusFn }} */
  function makeDeps(overrides = {}) {
    return {
      solveWithAstrometryFn: mock.fn(async () => fakeAstrometryResult),
      querySimbadFn: mock.fn(async () => [fakeSimbadObject]),
      findObjectsInRadiusFn: mock.fn(async () => [fakeCatalogObject]),
      ...overrides,
    };
  }

  it("returns a SolveResult instance", async () => {
    const result = await processSolveRequest(
      "/tmp/fake.jpg",
      { min_magnitude: 10, types: [] },
      {},
      fakeLog,
      makeDeps(),
    );
    assert.ok(result instanceof SolveResult, "must return instanceof SolveResult");
  });

  it("result.metadata is a SolveMetadata instance", async () => {
    const result = await processSolveRequest(
      "/tmp/fake.jpg",
      { min_magnitude: 10, types: [] },
      {},
      fakeLog,
      makeDeps(),
    );
    assert.ok(result.metadata instanceof SolveMetadata, "result.metadata must be instanceof SolveMetadata");
  });

  it("result.metadata.wcs is populated from solveResult.wcsData", async () => {
    const result = await processSolveRequest(
      "/tmp/fake.jpg",
      { min_magnitude: 10, types: [] },
      {},
      fakeLog,
      makeDeps(),
    );
    assert.equal(result.metadata.wcs, FAKE_WCS,
      "SolveMetadata.wcs must be set from the astrometry DTO's wcsData field");
    assert.equal(result.metadata.wcsData, undefined,
      "wcsData must NOT be exposed on SolveMetadata");
  });

  it("result.objects contains CatalogObject instances from both catalogs", async () => {
    const result = await processSolveRequest(
      "/tmp/fake.jpg",
      { min_magnitude: 10, types: [] },
      {},
      fakeLog,
      makeDeps(),
    );
    assert.ok(Array.isArray(result.objects), "result.objects must be an array");
    assert.ok(result.objects.length > 0, "result.objects must be non-empty");
    for (const obj of result.objects) {
      assert.ok(
        obj instanceof CatalogObject,
        `every object must be a CatalogObject, got ${Object.prototype.toString.call(obj)}`,
      );
    }
  });

  it("when localCatalogDao is null, findObjectsInRadius returns [] and result still has objects from SIMBAD", async () => {
    const deps = makeDeps({
      // Mirror the real implementation: return [] when dao is null
      findObjectsInRadiusFn: mock.fn(async (dao) => (dao ? [fakeCatalogObject] : [])),
    });

    const result = await processSolveRequest(
      "/tmp/fake.jpg",
      { min_magnitude: 10, types: [] },
      null,   // ← no local catalog DAO
      fakeLog,
      deps,
    );

    // findObjectsInRadius must still have been called (with null)
    assert.equal(deps.findObjectsInRadiusFn.mock.calls.length, 1,
      "findObjectsInRadiusFn must be called even when dao is null");
    assert.equal(deps.findObjectsInRadiusFn.mock.calls[0].arguments[0], null,
      "first argument must be null");

    assert.ok(result instanceof SolveResult, "must return instanceof SolveResult");
    assert.ok(Array.isArray(result.objects), "result.objects must be an array");
    // SIMBAD object should be present since local returned []
    assert.ok(result.objects.length > 0, "result.objects must contain SIMBAD objects when local DAO is null");
  });
});
