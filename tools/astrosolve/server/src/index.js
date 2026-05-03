import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import config from "./config.js";
import { initDatabases, openLocalCatalogDb } from "./db-init.js";
import solveRoute from "./routes/solve.route.js";

const fastify = Fastify({ logger: true });

const { accessKeysDb } = initDatabases(fastify.log);

let localCatalogDb = null;
try {
  localCatalogDb = openLocalCatalogDb();
  fastify.log.info(
    { path: config.localCatalogDbPath },
    "Local catalog DB opened",
  );
} catch (err) {
  fastify.log.warn(
    { err, path: config.localCatalogDbPath },
    "Local catalog DB not available — catalog queries will be skipped. Run 'npm run init-db' first.",
  );
}

// Register Rate Limiting
fastify.register(rateLimit, {
  max: 5,
  timeWindow: "1 minute",
});

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

// Register routes — pass open DB connections via plugin options (DI via Fastify plugin opts)
fastify.register(solveRoute, { accessKeysDb, localCatalogDb });

// Health check route
fastify.get("/", async (request, reply) => {
  return { status: "Astrosolve API is running" };
});

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
