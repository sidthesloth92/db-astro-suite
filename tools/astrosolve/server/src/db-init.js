import Database from "better-sqlite3";
import fs from "fs";
import config from "./config.js";

/**
 * Initialises all application databases, runs schema migrations, and returns
 * open database connections for use throughout the application lifecycle.
 *
 * The returned `accessKeysDb` connection is intended to remain open for the
 * lifetime of the server process. Callers must not close it manually.
 *
 * @param {import('pino').Logger} log - Fastify-compatible structured logger
 * @returns {{ accessKeysDb: import('better-sqlite3').Database }}
 */
export function initDatabases(log) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });

  const accessKeysDb = new Database(config.accessKeysDbPath);
  accessKeysDb.exec(`
    CREATE TABLE IF NOT EXISTS solve_api_access_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      key_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      active INTEGER NOT NULL DEFAULT 1,
      use_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  try {
    accessKeysDb.exec(
      "ALTER TABLE solve_api_access_keys ADD COLUMN use_count INTEGER NOT NULL DEFAULT 0",
    );
  } catch (err) {
    if (!err.message?.includes("duplicate column name")) {
      throw err;
    }
    log.debug(
      { table: "solve_api_access_keys", column: "use_count" },
      "use_count column already exists — skipping ALTER TABLE",
    );
  }

  log.info({ path: config.accessKeysDbPath }, "access-keys DB initialised");

  return { accessKeysDb };
}

/**
 * Opens a read-only connection to the local celestial catalog database.
 * Throws a `CatalogError` if the database file does not exist — callers should
 * catch this and treat the local catalog as unavailable rather than crashing.
 *
 * @returns {import('better-sqlite3').Database}
 * @throws {Error} If the database file is missing or cannot be opened
 */
export function openLocalCatalogDb() {
  return new Database(config.localCatalogDbPath, {
    readonly: true,
    fileMustExist: true,
  });
}
