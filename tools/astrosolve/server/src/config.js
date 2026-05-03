import path from "path";
import { fileURLToPath } from "url";
import { parsePositiveInteger } from "./utils/config.util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the top-level data directory (one level above `src/`). */
const DATA_DIR = path.join(__dirname, "../data");

/**
 * Centralised, validated configuration object.
 *
 * All environment variables are read once at import time and exposed as
 * a frozen object. Business logic must import `config` instead of
 * reading `process.env` directly.
 */
const config = Object.freeze({
  /** API server port. */
  port: parsePositiveInteger(process.env.ASTROSOLVE_PORT, 3000),

  /** API server host (0.0.0.0 for Docker). */
  host: process.env.ASTROSOLVE_HOST ?? "0.0.0.0",

  /** CORS origin — restrict in production via ASTROSOLVE_ORIGIN env var. */
  origin: (() => {
    const org = process.env.ASTROSOLVE_ORIGIN ?? "*";
    if (org.includes("localhost")) return "*";
    return org.includes(",") ? org.split(",").map((s) => s.trim()) : org;
  })(),

  /** Maximum concurrent plate-solve jobs. */
  queueConcurrency: parsePositiveInteger(
    process.env.ASTROSOLVE_QUEUE_CONCURRENCY,
    2,
  ),

  /** Maximum queued jobs before returning 503. */
  queueMaxSize: parsePositiveInteger(process.env.ASTROSOLVE_QUEUE_MAX_SIZE, 10),

  /** When true, POST /api/v1/solve requires a valid x-access-key header. */
  solveApiKeyRequired: process.env.SOLVE_API_KEY_REQUIRED === "true",

  /** Absolute path to the uploads directory for incoming images. */
  uploadsDir: path.join(DATA_DIR, "uploads"),

  /** Absolute path to the access-keys SQLite database. */
  accessKeysDbPath: path.join(DATA_DIR, "astrosolve.sqlite"),

  /** Absolute path to the local celestial catalog SQLite database. */
  localCatalogDbPath: path.join(DATA_DIR, "local-catalog/celestial.sqlite"),
});

export default config;
