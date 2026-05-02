import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

export function initDatabases(log) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const accessKeysDbPath = path.join(DATA_DIR, 'astrosolve.sqlite');
  const accessKeysDb = new Database(accessKeysDbPath);
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
      'ALTER TABLE solve_api_access_keys ADD COLUMN use_count INTEGER NOT NULL DEFAULT 0',
    );
  } catch (err) {
    if (!err.message?.includes('duplicate column name')) {
      throw err;
    }
    log.debug({ table: 'solve_api_access_keys', column: 'use_count' }, 'use_count column already exists — skipping ALTER TABLE');
  }

  accessKeysDb.close();
  log.info({ path: accessKeysDbPath }, 'access-keys DB initialised');
}
