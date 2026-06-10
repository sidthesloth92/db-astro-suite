/**
 * Route-level integration tests for POST /api/v1/solve and GET /api/v1/limits.
 *
 * Drives a real Fastify instance via `app.inject()`. External collaborators
 * (multipart parser, solve pipeline, DAOs) are replaced with mocks so the
 * tests stay deterministic and never touch the filesystem, SQLite, the
 * astrometry CLI, or the SIMBAD HTTP endpoint.
 *
 * Every assertion is grounded in the public API contract `{ code, message,
 * details }` and (for success responses) the frontend's `AstroSolveResponse`
 * shape declared in `tools/astrogram/src/app/services/models/astrosolve.response.ts`.
 */
import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import PQueue from "p-queue";
import crypto from "crypto";
import { buildTestApp } from "../test/build-test-app.util.js";
import {
  buildMultipart,
  buildSingleImageMultipart,
} from "../test/multipart.util.js";
import { SolveError, AstrometryError } from "../models/errors.model.js";
import {
  SolveResult,
  SolveMetadata,
  CatalogObject,
} from "../models/solve.model.js";

const VALID_KEY = "test-plain-key";
const VALID_KEY_HASH = crypto
  .createHash("sha256")
  .update(VALID_KEY)
  .digest("hex");

/**
 * Builds a SolveResult that mirrors the shape `processSolveRequest` produces,
 * including the analytics-only fields the route reads into `request.analytics`.
 *
 * @param {object} [overrides]
 * @returns {SolveResult & {solveStats:object, catalogStats:object, diagnostics:object, objectBreakdown:object}}
 */
function buildFakeSolveResult(overrides = {}) {
  const result = new SolveResult(
    new SolveMetadata(83.82, -5.39, 0.00125, "SIMPLE = T\n", 2.0),
    overrides.objects ?? [
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
    overrides.warnings ?? [],
  );
  result.solveStats = {
    duration_ms: 1234,
    sources_found: 200,
    field_width_arcmin: 60,
    field_height_arcmin: 40,
    field_rotation_deg: 0,
    match_count: 150,
    log_odds: 200,
    index_used: "index-4119",
  };
  result.catalogStats = {
    local_count: result.objects.length,
    simbad_count: 0,
    simbad_available: true,
  };
  result.diagnostics = {
    astrometry: { status: "ok" },
    simbad: { status: "ok" },
    local_catalog: { status: "ok" },
  };
  result.objectBreakdown = {
    stars: 0,
    galaxies: 0,
    nebulae: result.objects.length,
    clusters: 0,
    other: 0,
    fromLocal: result.objects.length,
    fromSimbad: 0,
  };
  return result;
}

/**
 * Builds an AccessKeyDao mock that recognises a single valid key hash.
 *
 * @param {{ keyId?: number, validHash?: string }} [opts]
 */
function buildAccessKeyDao(opts = {}) {
  const keyId = opts.keyId ?? 42;
  const validHash = opts.validHash ?? VALID_KEY_HASH;
  return {
    findActiveKeyByHash: mock.fn((hash) => (hash === validHash ? keyId : null)),
    incrementKeyUseCount: mock.fn(() => {}),
    insertAccessKey: () => {},
    deactivateAccessKey: () => {},
    rotateAccessKey: () => {},
    listAccessKeys: () => [],
  };
}

/**
 * Asserts a response body conforms to the API contract `{ code, message, details }`.
 *
 * @param {object} body
 */
function assertApiContract(body) {
  assert.equal(typeof body, "object", "body must be an object");
  assert.equal(typeof body.code, "string", "body.code must be a string");
  assert.equal(typeof body.message, "string", "body.message must be a string");
  assert.equal(typeof body.details, "object", "body.details must be an object");
  assert.notEqual(body.details, null, "body.details must not be null");
}

describe("POST /api/v1/solve", () => {
  let app;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("200 — happy path: returns SolveSuccessResponse matching the AstroSolveResponse shape", async () => {
    const accessKeyDao = buildAccessKeyDao();
    const fakeResult = buildFakeSolveResult();
    const processSolveRequest = mock.fn(async () => fakeResult);
    const parseMultipartRequest = mock.fn(async () => ({
      filePath: "/tmp/fake.jpg",
      hints: { min_magnitude: 20, types: [], ra_hint: null, dec_hint: null },
      fileSizeBytes: 1024,
      imageWidthPx: 2000,
      imageHeightPx: 2000,
      fileExtension: ".jpg",
    }));

    app = await buildTestApp({
      overrides: {
        accessKeyDao,
        parseMultipartRequest,
        processSolveRequest,
      },
    });

    const { payload, headers } = buildSingleImageMultipart();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/solve",
      headers: { ...headers, "x-access-key": VALID_KEY },
      payload,
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assertApiContract(body);
    assert.equal(body.code, "SOLVE_SUCCESS");

    // Frontend AstroSolveResponse contract: details.metadata + details.objects
    const details = body.details;
    assert.equal(typeof details.metadata.ra, "number");
    assert.equal(typeof details.metadata.dec, "number");
    assert.equal(typeof details.metadata.scale, "number");
    assert.equal(typeof details.metadata.wcs, "string");
    assert.equal(typeof details.metadata.radius_searched, "number");
    assert.ok(Array.isArray(details.objects));
    assert.equal(details.objects[0].source, "local");
    // No warnings field on the empty-warnings happy path
    assert.equal(Object.prototype.hasOwnProperty.call(details, "warnings"), false);

    // Access-key use_count incremented exactly once on the 200 path
    assert.equal(accessKeyDao.incrementKeyUseCount.mock.callCount(), 1);
  });

  it("200 — empty objects + warnings: details.warnings populated, details.objects empty", async () => {
    const accessKeyDao = buildAccessKeyDao();
    const fakeResult = buildFakeSolveResult({
      objects: [],
      warnings: [
        "Catalog service (SIMBAD) was unavailable; displayed objects may be incomplete.",
      ],
    });
    app = await buildTestApp({
      overrides: {
        accessKeyDao,
        parseMultipartRequest: mock.fn(async () => ({
          filePath: "/tmp/fake.jpg",
          hints: { min_magnitude: 20, types: [], ra_hint: null, dec_hint: null },
          fileSizeBytes: 1024,
          imageWidthPx: 2000,
          imageHeightPx: 2000,
          fileExtension: ".jpg",
        })),
        processSolveRequest: mock.fn(async () => fakeResult),
      },
    });

    const { payload, headers } = buildSingleImageMultipart();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/solve",
      headers: { ...headers, "x-access-key": VALID_KEY },
      payload,
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assertApiContract(body);
    assert.equal(body.details.objects.length, 0);
    assert.ok(Array.isArray(body.details.warnings));
    assert.ok(body.details.warnings.length > 0);
  });

  it("400 — multipart with wrong field name (no 'image' field) maps to VALIDATION_ERROR", async () => {
    const accessKeyDao = buildAccessKeyDao();
    const processSolveRequest = mock.fn(async () => buildFakeSolveResult());
    app = await buildTestApp({
      overrides: { accessKeyDao, processSolveRequest },
    });

    // Real parseMultipartRequest path with no image part — Fastify multipart
    // will throw, which the route maps to a 400 SolveError envelope.
    const { payload, headers } = buildMultipart([
      { name: "types", value: "star" },
    ]);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/solve",
      headers: { ...headers, "x-access-key": VALID_KEY },
      payload,
    });

    assert.equal(res.statusCode, 400);
    const body = res.json();
    assertApiContract(body);
    assert.equal(body.code, "VALIDATION_ERROR");
    assert.equal(processSolveRequest.mock.callCount(), 0);
    assert.equal(accessKeyDao.incrementKeyUseCount.mock.callCount(), 1); // preHandler ran
  });

  it("400 — disallowed extension (.txt) maps to VALIDATION_ERROR", async () => {
    const accessKeyDao = buildAccessKeyDao();
    const processSolveRequest = mock.fn(async () => buildFakeSolveResult());
    app = await buildTestApp({
      overrides: { accessKeyDao, processSolveRequest },
    });

    const { payload, headers } = buildSingleImageMultipart({
      filename: "notes.txt",
      contentType: "text/plain",
      content: Buffer.from("hello"),
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/solve",
      headers: { ...headers, "x-access-key": VALID_KEY },
      payload,
    });

    assert.equal(res.statusCode, 400);
    const body = res.json();
    assertApiContract(body);
    assert.equal(body.code, "VALIDATION_ERROR");
    assert.match(body.message, /extension/i);
    assert.equal(processSolveRequest.mock.callCount(), 0);
  });

  it("400 — file under minDimension maps to VALIDATION_ERROR (via service throwing SolveError)", async () => {
    const accessKeyDao = buildAccessKeyDao();
    const processSolveRequest = mock.fn(async () => buildFakeSolveResult());
    const parseMultipartRequest = mock.fn(async () => {
      throw new SolveError(
        400,
        "Image resolution is too low (500x500). Minimum 1000x1000 required on both axes.",
      );
    });

    app = await buildTestApp({
      overrides: { accessKeyDao, parseMultipartRequest, processSolveRequest },
    });

    const { payload, headers } = buildSingleImageMultipart();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/solve",
      headers: { ...headers, "x-access-key": VALID_KEY },
      payload,
    });

    assert.equal(res.statusCode, 400);
    const body = res.json();
    assertApiContract(body);
    assert.equal(body.code, "VALIDATION_ERROR");
    assert.match(body.message, /too low/i);
    assert.equal(processSolveRequest.mock.callCount(), 0);
  });

  it("malformed multipart (no boundary in content-type) is mapped to SOLVE_FAILED (current behaviour)", async () => {
    const accessKeyDao = buildAccessKeyDao();
    app = await buildTestApp({ overrides: { accessKeyDao } });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/solve",
      headers: {
        "content-type": "multipart/form-data", // missing boundary
        "x-access-key": VALID_KEY,
      },
      payload: Buffer.from("garbage"),
    });

    // BUG-CANDIDATE (documented, not fixed by this test track):
    // Fastify's multipart parser throws a non-`SolveError` for a malformed
    // body, so the route's catch-all maps it to 500 SOLVE_FAILED instead of
    // the intent-correct 400 VALIDATION_ERROR. The response still conforms
    // to the API contract, so we lock that in and flag the status code as
    // current behaviour for a follow-up fix to address.
    assert.equal(res.statusCode, 500);
    const body = res.json();
    assertApiContract(body);
    assert.equal(body.code, "SOLVE_FAILED");
  });

  it("401 — missing x-access-key header returns UNAUTHORIZED", async () => {
    const accessKeyDao = buildAccessKeyDao();
    const processSolveRequest = mock.fn(async () => buildFakeSolveResult());
    app = await buildTestApp({
      overrides: { accessKeyDao, processSolveRequest },
    });

    const { payload, headers } = buildSingleImageMultipart();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/solve",
      headers, // no x-access-key
      payload,
    });

    assert.equal(res.statusCode, 401);
    const body = res.json();
    assertApiContract(body);
    assert.equal(body.code, "UNAUTHORIZED");
    assert.equal(processSolveRequest.mock.callCount(), 0);
    assert.equal(accessKeyDao.incrementKeyUseCount.mock.callCount(), 0);
  });

  it("401 — invalid key (hash mismatch) returns UNAUTHORIZED without invoking solver", async () => {
    const accessKeyDao = buildAccessKeyDao();
    const processSolveRequest = mock.fn(async () => buildFakeSolveResult());
    app = await buildTestApp({
      overrides: { accessKeyDao, processSolveRequest },
    });

    const { payload, headers } = buildSingleImageMultipart();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/solve",
      headers: { ...headers, "x-access-key": "definitely-wrong" },
      payload,
    });

    assert.equal(res.statusCode, 401);
    const body = res.json();
    assertApiContract(body);
    assert.equal(body.code, "UNAUTHORIZED");
    assert.equal(accessKeyDao.findActiveKeyByHash.mock.callCount(), 1);
    assert.equal(accessKeyDao.incrementKeyUseCount.mock.callCount(), 0);
    assert.equal(processSolveRequest.mock.callCount(), 0);
  });

  it("503 — queue saturated returns SERVER_BUSY without invoking solver for the rejected request", async () => {
    const accessKeyDao = buildAccessKeyDao();
    // Solver hangs until we release it — keeps the first request occupying
    // the queue while the second arrives.
    let releaseFirst;
    const firstStarted = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    let resolverCount = 0;
    const processSolveRequest = mock.fn(async () => {
      resolverCount += 1;
      await firstStarted;
      return buildFakeSolveResult();
    });
    const parseMultipartRequest = mock.fn(async () => ({
      filePath: "/tmp/fake.jpg",
      hints: { min_magnitude: 20, types: [], ra_hint: null, dec_hint: null },
      fileSizeBytes: 1024,
      imageWidthPx: 2000,
      imageHeightPx: 2000,
      fileExtension: ".jpg",
    }));

    // queueMaxSize=1 + concurrency=1: a single in-flight solve occupies the
    // queue depth budget, so the next request hits the QUEUE_FULL branch.
    app = await buildTestApp({
      overrides: {
        accessKeyDao,
        parseMultipartRequest,
        processSolveRequest,
        config: { queueMaxSize: 1 },
        solveQueue: new PQueue({ concurrency: 1 }),
      },
    });

    const { payload, headers } = buildSingleImageMultipart();
    const reqOpts = {
      method: "POST",
      url: "/api/v1/solve",
      headers: { ...headers, "x-access-key": VALID_KEY },
      payload,
    };

    const first = app.inject(reqOpts);
    // Wait for the first request to enter the solver before firing the second.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const secondRes = await app.inject(reqOpts);

    assert.equal(secondRes.statusCode, 503);
    const secondBody = secondRes.json();
    assertApiContract(secondBody);
    assert.equal(secondBody.code, "SERVER_BUSY");

    releaseFirst();
    const firstRes = await first;
    assert.equal(firstRes.statusCode, 200);
    assert.equal(resolverCount, 1); // solver only invoked for the first request
  });

  it("500 — solver throws AstrometryError returns SOLVE_FAILED with no stack trace", async () => {
    const accessKeyDao = buildAccessKeyDao();
    const processSolveRequest = mock.fn(async () => {
      throw new AstrometryError("solve-field exited non-zero", null, {
        exit_code: 1,
      });
    });
    const parseMultipartRequest = mock.fn(async () => ({
      filePath: "/tmp/fake.jpg",
      hints: { min_magnitude: 20, types: [], ra_hint: null, dec_hint: null },
      fileSizeBytes: 1024,
      imageWidthPx: 2000,
      imageHeightPx: 2000,
      fileExtension: ".jpg",
    }));

    app = await buildTestApp({
      overrides: { accessKeyDao, parseMultipartRequest, processSolveRequest },
    });

    const { payload, headers } = buildSingleImageMultipart();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/solve",
      headers: { ...headers, "x-access-key": VALID_KEY },
      payload,
    });

    assert.equal(res.statusCode, 500);
    const body = res.json();
    assertApiContract(body);
    assert.equal(body.code, "SOLVE_FAILED");
    // The response body must NOT leak the raw stack trace or the internal
    // exit_code diagnostics — only the sanitised public message.
    const serialised = JSON.stringify(body);
    assert.ok(!/exit_code/.test(serialised));
    assert.ok(!/AstrometryError/.test(serialised));
  });

  it("500 — solver throws a generic Error returns SOLVE_FAILED", async () => {
    const accessKeyDao = buildAccessKeyDao();
    const processSolveRequest = mock.fn(async () => {
      throw new Error("unexpected blow-up");
    });
    const parseMultipartRequest = mock.fn(async () => ({
      filePath: "/tmp/fake.jpg",
      hints: { min_magnitude: 20, types: [], ra_hint: null, dec_hint: null },
      fileSizeBytes: 1024,
      imageWidthPx: 2000,
      imageHeightPx: 2000,
      fileExtension: ".jpg",
    }));

    app = await buildTestApp({
      overrides: { accessKeyDao, parseMultipartRequest, processSolveRequest },
    });

    const { payload, headers } = buildSingleImageMultipart();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/solve",
      headers: { ...headers, "x-access-key": VALID_KEY },
      payload,
    });

    assert.equal(res.statusCode, 500);
    const body = res.json();
    assertApiContract(body);
    assert.equal(body.code, "SOLVE_FAILED");
    assert.ok(!/unexpected blow-up/.test(JSON.stringify(body)));
  });

  it("504 — a solve that exceeds the task timeout returns SOLVE_TIMEOUT and frees the slot", async () => {
    const accessKeyDao = buildAccessKeyDao();
    // Never settles — the per-task backstop timeout must reclaim the slot.
    const processSolveRequest = mock.fn(() => new Promise(() => {}));
    const parseMultipartRequest = mock.fn(async () => ({
      filePath: "/tmp/fake-timeout.jpg",
      hints: { min_magnitude: 20, types: [], ra_hint: null, dec_hint: null },
      fileSizeBytes: 1024,
      imageWidthPx: 2000,
      imageHeightPx: 2000,
      fileExtension: ".jpg",
    }));

    app = await buildTestApp({
      overrides: {
        accessKeyDao,
        parseMultipartRequest,
        processSolveRequest,
        config: { solveTaskTimeoutMs: 100 },
      },
    });

    const { payload, headers } = buildSingleImageMultipart();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/solve",
      headers: { ...headers, "x-access-key": VALID_KEY },
      payload,
    });

    assert.equal(res.statusCode, 504);
    const body = res.json();
    assertApiContract(body);
    assert.equal(body.code, "SOLVE_TIMEOUT");
  });

  // TODO(abort-on-disconnect): The 499 CLIENT_CLOSED_REQUEST path is disabled
  // while the abort-on-disconnect feature is not wired in the route. Docker
  // Desktop's virtual network proxy closes the container-side socket at the
  // HTTP request/response boundary (~1ms after body consumption), making the
  // socket 'close' event unreliable as a disconnect signal in that environment.
  // Re-enable this test when the feature is restored with proper environment
  // isolation or a settle delay that skips the spurious lifecycle close.
});

describe("GET /api/v1/limits", () => {
  let app;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("200 — returns the UploadLimits payload the frontend consumes", async () => {
    app = await buildTestApp({
      overrides: {
        config: {
          uploadMaxBytes: 5 * 1024 * 1024,
          uploadMinDimension: 800,
          uploadMaxDimension: 6000,
          uploadAllowedExtensions: [".jpg", ".png"],
        },
      },
    });

    const res = await app.inject({ method: "GET", url: "/api/v1/limits" });

    assert.equal(res.statusCode, 200);
    const body = res.json();

    // Today the limits endpoint returns the raw upload-limits object, not the
    // {code,message,details} envelope. Frontend `UploadLimits` model consumes
    // this shape directly — see tools/astrogram/src/app/services/astrosolve.service.ts.
    assert.equal(body.maxBytes, 5 * 1024 * 1024);
    assert.equal(body.minDimension, 800);
    assert.equal(body.maxDimension, 6000);
    assert.deepEqual(body.allowedExtensions, [".jpg", ".png"]);
  });
});
