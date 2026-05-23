import fs from "fs";
import Fastify from "fastify";
import pino from "pino";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import config from "./config.js";
import {
  SOLVE_RATE_LIMIT,
  HEALTH_RATE_LIMIT,
} from "./constants/rate-limit.constants.js";
import { SqliteAccessKeyDao } from "./dao/sqlite-access-key.dao.js";
import { SqliteLocalCatalogDao } from "./dao/sqlite-local-catalog.dao.js";
import { SqliteSolveEventDao } from "./dao/sqlite-solve-event.dao.js";
import solveRoute from "./routes/solve.route.js";

// Sync destination so logs are written immediately and never sit in pino's
// 4 KB buffer waiting for the next request — critical when running inside a
// container where `docker logs` only sees what has actually been flushed.
const fastify = Fastify({
  loggerInstance: pino(
    { level: config.logLevel },
    pino.destination({ sync: true }),
  ),
  trustProxy: config.trustProxy,
});

// Ensure the uploads directory exists before any file handling begins.
fs.mkdirSync(config.uploadsDir, { recursive: true });

// Each DAO owns its own database connection and initialization.
const accessKeyDao = SqliteAccessKeyDao.create();
fastify.log.info(
  { path: config.accessKeysDbPath },
  "Access-keys DB initialised",
);

const solveEventDao = SqliteSolveEventDao.create();
fastify.log.info(
  { path: config.accessKeysDbPath },
  "Solve-events table initialised",
);

let localCatalogDao;
try {
  localCatalogDao = SqliteLocalCatalogDao.create();
  fastify.log.info(
    { path: config.localCatalogDbPath },
    "Local catalog DB opened",
  );
} catch (err) {
  fastify.log.error(
    { err, path: config.localCatalogDbPath },
    "Local catalog DB failed to open — run 'npm run init-db' first. Aborting.",
  );
  process.exit(1);
}

// Register Rate Limiting — applied globally with per-IP key based on real client IP.
// When behind Cloudflare (trustProxy: true), Fastify resolves the real IP from
// X-Forwarded-For, so rate limits are per actual client rather than the proxy.
//
// MUST be `await`-ed: without the await, the plugin queues for later
// initialisation, but the onRequest hooks it installs miss the routes
// registered below — so the server reports 200 instead of 429 even past
// the configured cap. With await, the hooks attach before routes do.
await fastify.register(rateLimit, SOLVE_RATE_LIMIT);

// Security headers — applied before any route handlers.
fastify.register(helmet);

// Register CORS
// Set ASTROSOLVE_ORIGIN env var to restrict to a specific origin in production (e.g. https://yourapp.com)
fastify.register(cors, {
  origin: config.origin,
  methods: ["GET", "POST"],
});

// Configure Multipart for file uploads immediately saving to disk.
// Size limit is config-driven so ops can tune it via ASTROSOLVE_UPLOAD_MAX_BYTES.
fastify.register(multipart, {
  limits: {
    fileSize: config.uploadMaxBytes,
  },
});

// Register routes — pass DAO instances via plugin options (DI via Fastify plugin opts)
fastify.register(solveRoute, { accessKeyDao, localCatalogDao, solveEventDao });

// Health check route — rate-limited separately at a higher threshold than
// the solve endpoint so monitoring/uptime probes are not blocked, while
// still protecting against abuse.
fastify.get(
  "/",
  {
    config: {
      rateLimit: HEALTH_RATE_LIMIT,
    },
  },
  async (request, reply) => {
    return { code: "OK", message: "Astrosolve API is running", details: {} };
  },
);

// Public upload limits — clients fetch this on load to prevalidate files
// and render an accurate UI hint. Rate-limited under HEALTH_RATE_LIMIT
// because the payload is small and the client caches it for the session.
fastify.get(
  "/api/v1/limits",
  {
    config: {
      rateLimit: HEALTH_RATE_LIMIT,
    },
  },
  async () => ({
    maxBytes: config.uploadMaxBytes,
    minDimension: config.uploadMinDimension,
    maxDimension: config.uploadMaxDimension,
    allowedExtensions: config.uploadAllowedExtensions,
  }),
);

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: config.host });
    fastify.log.info(`Server listening on port ${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
