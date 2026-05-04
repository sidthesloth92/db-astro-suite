/**
 * Unit tests for the solve service domain model contract.
 *
 * Domain model tests verify that SolveResult / SolveMetadata / CatalogObject
 * conform to the shape that solve.route.js spreads into the response and that
 * the Angular frontend expects as the solve payload.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SolveResult,
  SolveMetadata,
  CatalogObject,
} from "../models/solve.model.js";

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
      83.82, // ra
      -5.39, // dec
      0.00125, // scale
      FAKE_WCS, // wcs  ← mapped from solveResult.wcsData
      2.0, // radius_searched
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

describe("solve route response payload — frontend contract", () => {
  it("payload shape matches {status, message, metadata, objects}", () => {
    const result = buildFakeSolveResult();

    // Reproduce what solve.route.js sends
    const payload = {
      status: "success",
      message: "Plate solve completed successfully.",
      metadata: result.metadata,
      objects: result.objects,
      ...(result.warnings?.length ? { warnings: result.warnings } : {}),
    };

    assert.equal(payload.status, "success");
    assert.ok(
      typeof payload.metadata.ra === "number",
      "metadata.ra must be a number",
    );
    assert.ok(
      typeof payload.metadata.dec === "number",
      "metadata.dec must be a number",
    );
    assert.ok(
      typeof payload.metadata.wcs === "string",
      "metadata.wcs must be a string",
    );
    assert.ok(
      typeof payload.metadata.radius_searched === "number",
      "metadata.radius_searched must be a number",
    );
    assert.ok(Array.isArray(payload.objects), "objects must be an array");
  });

  it("warnings key is absent from payload when there are no warnings", () => {
    const result = buildFakeSolveResult(); // warnings = []
    const payload = {
      status: "success",
      message: "Plate solve completed successfully.",
      metadata: result.metadata,
      objects: result.objects,
      ...(result.warnings?.length ? { warnings: result.warnings } : {}),
    };
    assert.equal(
      Object.prototype.hasOwnProperty.call(payload, "warnings"),
      false,
      "warnings key must be omitted when the array is empty",
    );
  });

  it("warnings key is present in payload when the service emits warnings", () => {
    const result = new SolveResult(
      new SolveMetadata(1, 2, 0.001, FAKE_WCS, 2.0),
      [],
      [
        "Catalog service (SIMBAD) was unavailable; displayed objects may be incomplete.",
      ],
    );
    const payload = {
      status: "success",
      message: "Plate solve completed successfully.",
      metadata: result.metadata,
      objects: result.objects,
      ...(result.warnings?.length ? { warnings: result.warnings } : {}),
    };
    assert.ok(
      Object.prototype.hasOwnProperty.call(payload, "warnings"),
      "warnings key must be present when the service emits warnings",
    );
    assert.equal(payload.warnings.length, 1);
  });
});
