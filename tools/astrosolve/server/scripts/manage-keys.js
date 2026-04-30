import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { createKey, removeKey, listKeys } from '../src/access-key.service.js';
import { AccessKeyError } from '../src/access-key.error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/astrosolve.sqlite');

const [, , command, username] = process.argv;

const db = new Database(DB_PATH);

// Ensure the table exists so the CLI works standalone, before the init script is run.
db.exec(`
  CREATE TABLE IF NOT EXISTS solve_api_access_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    key_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    active INTEGER NOT NULL DEFAULT 1
  );
`);

try {
  switch (command) {
    case 'add': {
      if (!username) {
        console.error('Usage: node scripts/manage-keys.js add <username>');
        process.exit(1);
      }
      const key = createKey(db, username);
      console.log(`Key created for "${username}":`);
      console.log(key);
      break;
    }
    case 'remove': {
      if (!username) {
        console.error('Usage: node scripts/manage-keys.js remove <username>');
        process.exit(1);
      }
      removeKey(db, username);
      console.log(`Key deactivated for "${username}".`);
      break;
    }
    case 'list': {
      const keys = listKeys(db);
      if (keys.length === 0) {
        console.log('No access keys found.');
      } else {
        for (const k of keys) {
          const status = k.active ? 'active' : 'inactive';
          console.log(`${k.username}	${k.created_at}	${status}	${k.use_count} use(s)`);
        }
      }
      break;
    }
    default:
      console.error('Usage: node scripts/manage-keys.js <add|remove|list> [username]');
      process.exit(1);
  }
} catch (err) {
  if (err instanceof AccessKeyError) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error(`Unexpected error: ${err.message}`);
  }
  process.exit(1);
} finally {
  db.close();
}
