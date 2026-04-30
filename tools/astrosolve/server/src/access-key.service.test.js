import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { createKey, validateKey, incrementUseCount } from './access-key.service.js';

function createTestDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE solve_api_access_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      key_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      active INTEGER NOT NULL DEFAULT 1,
      use_count INTEGER NOT NULL DEFAULT 0
    )
  `);
  return db;
}

test('use_count increments after a successful auth', () => {
  const db = createTestDb();
  const plainKey = createKey(db, 'testuser');

  const keyId = validateKey(db, plainKey);
  assert.ok(keyId != null, 'validateKey should return an id for a valid key');

  incrementUseCount(db, keyId);

  const row = db
    .prepare('SELECT use_count FROM solve_api_access_keys WHERE id = ?')
    .get(keyId);
  assert.equal(row.use_count, 1);

  db.close();
});

test('use_count does not increment for invalid tokens', () => {
  const db = createTestDb();
  createKey(db, 'testuser');

  const keyId = validateKey(db, 'not-a-real-key');
  assert.equal(keyId, null, 'validateKey should return null for an invalid key');

  // keyId is null so the hook would not call incrementUseCount
  const row = db
    .prepare('SELECT use_count FROM solve_api_access_keys WHERE username = ?')
    .get('testuser');
  assert.equal(row.use_count, 0);

  db.close();
});

test('use_count increments correctly across multiple successful auths', () => {
  const db = createTestDb();
  const plainKey = createKey(db, 'multiuser');

  const keyId = validateKey(db, plainKey);
  assert.ok(keyId != null);

  incrementUseCount(db, keyId);
  incrementUseCount(db, keyId);
  incrementUseCount(db, keyId);

  const row = db
    .prepare('SELECT use_count FROM solve_api_access_keys WHERE id = ?')
    .get(keyId);
  assert.equal(row.use_count, 3);

  db.close();
});

test('use_count does not increment for inactive tokens', () => {
  const db = createTestDb();
  const plainKey = createKey(db, 'inactiveuser');

  // Deactivate the key
  db.prepare(
    'UPDATE solve_api_access_keys SET active = 0 WHERE username = ?',
  ).run('inactiveuser');

  const keyId = validateKey(db, plainKey);
  assert.equal(keyId, null, 'validateKey should return null for an inactive key');

  const row = db
    .prepare('SELECT use_count FROM solve_api_access_keys WHERE username = ?')
    .get('inactiveuser');
  assert.equal(row.use_count, 0);

  db.close();
});
