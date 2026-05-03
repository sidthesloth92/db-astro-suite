import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import config from "./config.js";
import { initDatabases, openLocalCatalogDb } from "./db-init.js";
import { SqliteAccessKeyDao } from "./dao/access-key.dao.js";
import { SqliteLocalCatalogDao } from "./dao/local-catalog.dao.js";
import solveRoute from "./routes/solve.route.js";

const fastify = Fastify({ logger: true });

const { accessKeysDb } = initDatabases(fastify.log);
const accessKeyDao = new SqliteAccessKeyDao(accessKeysDb);

let localCatalogDao;
try {
  const localCatalogDb = openLocalCatalogDb();
  fastify.log.info(
    { path: config.localCatalogDbPath },
    "Local catalog DB opened",
  );
  localCatalogDao = new SqliteLocalCatalogDao(localCatalogDb);
} catch (err) {
  fastify.log.error(
    { err, path: config.localCatalogDbPath },
    "Local catalog DB failed to open — run 'npm run init-db' first. Aborting.",
  );
  process.exit(1);
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

// Register routes — pass DAO instances via plugin options (DI via Fastify plugin opts)
fastify.register(solveRoute, { accessKeyDao, localCatalogDao });

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
