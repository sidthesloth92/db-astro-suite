import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

/**
 * Initialises all SQLite databases required at runtime.
 * Called once at server startup — all statements use CREATE TABLE IF NOT EXISTS
 * so this is safe to run on every boot against an existing DB.
 *
 * @param {import('fastify').FastifyBaseLogger} log
 */
export function initDatabases(log) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Access-keys database
  const accessKeysDbPath = path.join(DATA_DIR, 'access-keys.sqlite');
  const accessKeysDb = new Database(accessKeysDbPath);
  accessKeysDb.exec(`
    CREATE TABLE IF NOT EXISTS solve_api_access_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      key_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      active INTEGER NOT NULL DEFAULT 1
    )
  `);
  accessKeysDb.close();
  log.info({ path: accessKeysDbPath }, 'access-keys DB initialised');
}
