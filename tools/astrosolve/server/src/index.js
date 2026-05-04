import fs from "fs";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import config from "./config.js";
import { SqliteAccessKeyDao } from "./dao/sqlite-access-key.dao.js";
import { SqliteLocalCatalogDao } from "./dao/sqlite-local-catalog.dao.js";
import solveRoute from "./routes/solve.route.js";

const fastify = Fastify({ logger: true, trustProxy: config.trustProxy });

// Ensure the uploads directory exists before any file handling begins.
fs.mkdirSync(config.uploadsDir, { recursive: true });

// Each DAO owns its own database connection and initialization.
const accessKeyDao = SqliteAccessKeyDao.create();
fastify.log.info(
  { path: config.accessKeysDbPath },
  "Access-keys DB initialised",
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
fastify.register(rateLimit, {
  max: config.rateLimitMax,
  timeWindow: config.rateLimitWindow,
});

// Security headers — applied before any route handlers.
fastify.register(helmet);

// Register CORS
// Set ASTROSOLVE_ORIGIN env var to restrict to a specific origin in production (e.g. https://yourapp.com)
fastify.register(cors, {
  origin: config.origin,
  methods: ["GET", "POST"],
});

// Configure Multipart for file uploads immediately saving to disk
fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Register routes — pass DAO instances via plugin options (DI via Fastify plugin opts)
fastify.register(solveRoute, { accessKeyDao, localCatalogDao });

// Health check route — rate-limited separately at a higher threshold than
// the solve endpoint so monitoring/uptime probes are not blocked, while
// still protecting against abuse.
fastify.get(
  "/",
  {
    config: {
      rateLimit: {
        max: config.healthRateLimitMax,
        timeWindow: "1 minute",
      },
    },
  },
  async (request, reply) => {
    return { status: "Astrosolve API is running" };
  },
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
