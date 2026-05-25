/**
 * Tests for the access-key preHandler hook in isolation.
 *
 * Builds a tiny Fastify app that wires the hook on a no-op `GET /probe`
 * handler and drives it via `app.inject()`. This keeps the hook fully
 * decoupled from the solve route while still exercising the real Fastify
 * lifecycle (headers, status codes, body serialisation).
 */
import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import Fastify from "fastify";
import { solveAuthHook } from "./solve-auth.hook.js";
import { initSolveAnalytics } from "./solve-analytics.hook.js";
import { SolveEventOutcome } from "../models/solve-event.model.js";

const VALID_KEY = "another-test-key";
const VALID_HASH = crypto.createHash("sha256").update(VALID_KEY).digest("hex");

/**
 * Builds a minimal Fastify instance with the auth hook + analytics-init hook
 * wired in front of a no-op /probe route that echoes `request.analytics`.
 *
 * @param {object} accessKeyDao
 */
async function buildHookApp(accessKeyDao) {
  const app = Fastify({ logger: false });
  app.addHook("onRequest", initSolveAnalytics);
  app.addHook("preHandler", solveAuthHook({}, accessKeyDao));
  app.get("/probe", async (request) => ({
    analytics: request.analytics,
  }));
  await app.ready();
  return app;
}

/**
 * Builds an AccessKeyDao mock that recognises a single valid key hash.
 *
 * @param {{ keyId?: number, validHash?: string, throwOnLookup?: boolean }} [opts]
 */
function buildAccessKeyDao(opts = {}) {
  const keyId = opts.keyId ?? 7;
  return {
    findActiveKeyByHash: mock.fn((hash) => {
      if (opts.throwOnLookup) throw new Error("DB exploded");
      return hash === (opts.validHash ?? VALID_HASH) ? keyId : null;
    }),
    incrementKeyUseCount: mock.fn(() => {}),
  };
}

describe("solveAuthHook", () => {
  let app;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("401 — missing x-access-key header rejects with UNAUTHORIZED envelope", async () => {
    const accessKeyDao = buildAccessKeyDao();
    app = await buildHookApp(accessKeyDao);

    const res = await app.inject({ method: "GET", url: "/probe" });

    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.code, "UNAUTHORIZED");
    assert.equal(typeof body.message, "string");
    assert.deepEqual(body.details, {});
    assert.equal(accessKeyDao.findActiveKeyByHash.mock.callCount(), 0);
    assert.equal(accessKeyDao.incrementKeyUseCount.mock.callCount(), 0);
  });

  it("401 — invalid key (hash not found) rejects with UNAUTHORIZED", async () => {
    const accessKeyDao = buildAccessKeyDao();
    app = await buildHookApp(accessKeyDao);

    const res = await app.inject({
      method: "GET",
      url: "/probe",
      headers: { "x-access-key": "not-the-real-key" },
    });

    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.code, "UNAUTHORIZED");
    assert.equal(accessKeyDao.findActiveKeyByHash.mock.callCount(), 1);
    assert.equal(accessKeyDao.incrementKeyUseCount.mock.callCount(), 0);
  });

  it("401 — DAO throws during validation is reported as UNAUTHORIZED (not 500)", async () => {
    const accessKeyDao = buildAccessKeyDao({ throwOnLookup: true });
    app = await buildHookApp(accessKeyDao);

    const res = await app.inject({
      method: "GET",
      url: "/probe",
      headers: { "x-access-key": "anything" },
    });

    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.code, "UNAUTHORIZED");
    assert.equal(accessKeyDao.incrementKeyUseCount.mock.callCount(), 0);
  });

  it("200 — valid key proceeds to the handler and populates request.analytics.key_id", async () => {
    const accessKeyDao = buildAccessKeyDao({ keyId: 99 });
    app = await buildHookApp(accessKeyDao);

    const res = await app.inject({
      method: "GET",
      url: "/probe",
      headers: { "x-access-key": VALID_KEY },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.analytics.key_id, 99);
    assert.equal(accessKeyDao.findActiveKeyByHash.mock.callCount(), 1);
    assert.equal(accessKeyDao.incrementKeyUseCount.mock.callCount(), 1);
  });

  it("auth failure stamps analytics outcome=AUTH_FAILED + response_code=UNAUTHORIZED", async () => {
    const accessKeyDao = buildAccessKeyDao();
    const app2 = Fastify({ logger: false });
    let capturedAnalytics;
    app2.addHook("onRequest", initSolveAnalytics);
    app2.addHook("preHandler", solveAuthHook({}, accessKeyDao));
    app2.addHook("onResponse", async (request) => {
      capturedAnalytics = request.analytics;
    });
    app2.get("/probe", async () => ({}));
    await app2.ready();
    try {
      await app2.inject({ method: "GET", url: "/probe" });
      assert.equal(capturedAnalytics.outcome, SolveEventOutcome.AUTH_FAILED);
      assert.equal(capturedAnalytics.response_code, "UNAUTHORIZED");
      assert.match(capturedAnalytics.error_message, /header missing/i);
    } finally {
      await app2.close();
    }
  });
});
