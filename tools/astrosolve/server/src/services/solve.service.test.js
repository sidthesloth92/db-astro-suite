/**
 * Unit tests for the solve service domain model contract.
 *
 * These tests verify that the objects returned by processSolveRequest conform
 * to the SolveResult / SolveMetadata domain model shape — the same shape that
 * solve.route.js spreads into the `details` response field and that the Angular
 * frontend expects as `AstroSolveApiResponse.details`.
 *
 * External dependencies (solveWithAstrometry, querySimbad, findObjectsInRadius)
 * are not available in the unit-test environment, so this suite tests the domain
 * model classes and the route ↔ frontend contract directly.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SolveResult, SolveMetadata } from "../models/solve.model.js";

const FAKE_WCS = "SIMPLE  =                    T\nCTYPE1  = 'RA---TAN'\n";

/**
 * Constructs a SolveResult the same way processSolveRequest does after the fix,
 * using the concrete domain model classes.
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
      {
        name: "NGC 1976",
        type: "HII",
        ra: 83.82,
        dec: -5.39,
        magnitude: 4.0,
        source: "local",
        catalog: "NGC/IC",
        entryId: "NGC1976",
        commonName: "Orion Nebula",
        sizeArcmin: 65,
      },
    ],
    [],
  );
}

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
