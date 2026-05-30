import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import defaultConfig from "../config.js";
import {
  SOLVE_RATE_LIMIT,
  HEALTH_RATE_LIMIT,
} from "../constants/rate-limit.constants.js";
import solveRoute from "../routes/solve.route.js";

/**
 * Builds an in-process Fastify app that mirrors the production wiring in
 * `src/index.js` while letting individual collaborators be replaced via
 * `overrides`. Designed to be driven by `app.inject()` — never call `.listen()`
 * on the returned instance.
 *
 * Every collaborator is optional:
 *   - `accessKeyDao` / `localCatalogDao` / `solveEventDao` default to noop
 *     stubs that satisfy the abstract DAO interface.
 *   - `config` defaults to the production frozen config singleton, but
 *     individual fields can be overridden by passing a partial object — the
 *     helper merges the overrides on top of the defaults.
 *   - `parseMultipartRequest` / `processSolveRequest` default to the real
 *     service functions; override them with `mock.fn(...)` (or any function)
 *     to short-circuit multipart parsing or the solver pipeline.
 *   - `solveAuthHook` defaults to the real auth hook (so providing only an
 *     `accessKeyDao` exercises the real validation path).
 *   - `solveQueue` defaults to a fresh PQueue scoped to this app instance.
 *
 * @param {{
 *   overrides?: {
 *     accessKeyDao?: object,
 *     localCatalogDao?: object,
 *     solveEventDao?: object,
 *     config?: object,
 *     parseMultipartRequest?: Function,
 *     processSolveRequest?: Function,
 *     solveAuthHook?: Function,
 *     solveQueue?: object,
 *   }
 * }} [options]
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
export async function buildTestApp(options = {}) {
  const overrides = options.overrides ?? {};

  const config = overrides.config
    ? Object.freeze({ ...defaultConfig, ...overrides.config })
    : defaultConfig;

  const accessKeyDao = overrides.accessKeyDao ?? buildNoopAccessKeyDao();
  const localCatalogDao =
    overrides.localCatalogDao ?? buildNoopLocalCatalogDao();
  const solveEventDao = overrides.solveEventDao ?? buildNoopSolveEventDao();

  const app = Fastify({
    // Silence test-run logs unless a test explicitly opts in.
    logger: false,
  });

  // Mirror production plugin registration order — rate-limit MUST be awaited
  // before route registration so its onRequest hook attaches in time.
  await app.register(rateLimit, SOLVE_RATE_LIMIT);
  await app.register(helmet);
  await app.register(cors, {
    origin: config.origin || "*",
    methods: ["GET", "POST"],
  });
  await app.register(multipart, {
    limits: { fileSize: config.uploadMaxBytes },
  });

  await app.register(solveRoute, {
    accessKeyDao,
    localCatalogDao,
    solveEventDao,
    config,
    parseMultipartRequest: overrides.parseMultipartRequest,
    processSolveRequest: overrides.processSolveRequest,
    solveAuthHook: overrides.solveAuthHook,
    solveQueue: overrides.solveQueue,
  });

  // Mirror the `/api/v1/limits` route from src/index.js.
  app.get(
    "/api/v1/limits",
    { config: { rateLimit: HEALTH_RATE_LIMIT } },
    async () => ({
      maxBytes: config.uploadMaxBytes,
      minDimension: config.uploadMinDimension,
      maxDimension: config.uploadMaxDimension,
      allowedExtensions: config.uploadAllowedExtensions,
    }),
  );

  app.get(
    "/",
    { config: { rateLimit: HEALTH_RATE_LIMIT } },
    async () => ({ code: "OK", message: "Astrosolve API is running", details: {} }),
  );

  return app;
}

/**
 * Builds a no-op AccessKeyDao stub that returns null for lookups and ignores
 * mutating calls. Useful when a test does not exercise the auth hook.
 *
 * @returns {object}
 */
export function buildNoopAccessKeyDao() {
  return {
    findActiveKeyByHash: () => null,
    incrementKeyUseCount: () => {},
    insertAccessKey: () => {},
    deactivateAccessKey: () => {},
    rotateAccessKey: () => {},
    listAccessKeys: () => [],
  };
}

/**
 * Builds a no-op LocalCatalogDao stub. Returns an empty result set for every
 * region query so tests can drive the solve pipeline without touching SQLite.
 *
 * @returns {object}
 */
export function buildNoopLocalCatalogDao() {
  return {
    queryObjectsInRegion: () => [],
  };
}

/**
 * Builds a no-op SolveEventDao stub that ignores all writes. The analytics
 * hook is best-effort and never throws, so a silent stub is safe.
 *
 * @returns {object}
 */
export function buildNoopSolveEventDao() {
  return {
    insertEvent: () => {},
    listRecent: () => [],
    listSince: () => [],
    listRecentFailures: () => [],
    iterateAll: () => [],
  };
}
