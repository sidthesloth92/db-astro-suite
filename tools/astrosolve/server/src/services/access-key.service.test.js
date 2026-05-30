import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { SqliteAccessKeyDao } from '../dao/sqlite-access-key.dao.js';
import { AccessKeyError } from '../models/errors.model.js';
import {
  createKey,
  validateKey,
  incrementUseCount,
  rotateKey,
} from './access-key.service.js';

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
  const dao = new SqliteAccessKeyDao(db);
  const plainKey = createKey(dao, 'testuser');

  const keyId = validateKey(dao, plainKey);
  assert.ok(keyId != null, 'validateKey should return an id for a valid key');

  incrementUseCount(dao, keyId);

  const row = db
    .prepare('SELECT use_count FROM solve_api_access_keys WHERE id = ?')
    .get(keyId);
  assert.equal(row.use_count, 1);

  db.close();
});

test('use_count does not increment for invalid tokens', () => {
  const db = createTestDb();
  const dao = new SqliteAccessKeyDao(db);
  createKey(dao, 'testuser');

  const keyId = validateKey(dao, 'not-a-real-key');
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
  const dao = new SqliteAccessKeyDao(db);
  const plainKey = createKey(dao, 'multiuser');

  const keyId = validateKey(dao, plainKey);
  assert.ok(keyId != null);

  incrementUseCount(dao, keyId);
  incrementUseCount(dao, keyId);
  incrementUseCount(dao, keyId);

  const row = db
    .prepare('SELECT use_count FROM solve_api_access_keys WHERE id = ?')
    .get(keyId);
  assert.equal(row.use_count, 3);

  db.close();
});

test('rotateKey returns a new plain key, invalidates the old one, and preserves use_count', () => {
  const db = createTestDb();
  const dao = new SqliteAccessKeyDao(db);
  const oldKey = createKey(dao, 'rotateuser');

  // Use the key a couple of times so we can assert use_count survives.
  const oldId = validateKey(dao, oldKey);
  incrementUseCount(dao, oldId);
  incrementUseCount(dao, oldId);

  const newKey = rotateKey(dao, 'rotateuser');
  assert.ok(typeof newKey === 'string' && newKey.length > 0);
  assert.notEqual(newKey, oldKey, 'rotated key must differ from the old one');

  // Old key no longer authenticates.
  assert.equal(validateKey(dao, oldKey), null);

  // New key authenticates and points at the same row.
  const newId = validateKey(dao, newKey);
  assert.ok(newId != null);
  assert.equal(newId, oldId, 'rotate should not create a new row');

  // use_count is preserved (still 2 — same row, just new hash).
  const row = db
    .prepare('SELECT use_count FROM solve_api_access_keys WHERE id = ?')
    .get(newId);
  assert.equal(row.use_count, 2);

  db.close();
});

test('rotateKey throws AccessKeyError when username does not exist', () => {
  const db = createTestDb();
  const dao = new SqliteAccessKeyDao(db);

  assert.throws(
    () => rotateKey(dao, 'nobody'),
    (err) => err instanceof AccessKeyError && /not found/i.test(err.message),
  );

  db.close();
});

test('rotateKey reactivates a previously deactivated key so the new key can authenticate', () => {
  const db = createTestDb();
  const dao = new SqliteAccessKeyDao(db);

  // Create, use once, then deactivate.
  createKey(dao, 'deactivateduser');
  dao.deactivateAccessKey('deactivateduser');

  // Confirm deactivation took effect.
  const beforeRow = db
    .prepare('SELECT active FROM solve_api_access_keys WHERE username = ?')
    .get('deactivateduser');
  assert.equal(beforeRow.active, 0, 'key must be inactive after remove');

  // Rotate should reactivate.
  const newKey = rotateKey(dao, 'deactivateduser');
  assert.ok(typeof newKey === 'string' && newKey.length > 0);

  const afterRow = db
    .prepare('SELECT active FROM solve_api_access_keys WHERE username = ?')
    .get('deactivateduser');
  assert.equal(afterRow.active, 1, 'rotate must set active = 1');

  // validateKey must now return a valid id.
  const keyId = validateKey(dao, newKey);
  assert.ok(keyId != null, 'new key must authenticate after rotate');

  db.close();
});

test('use_count does not increment for inactive tokens', () => {
  const db = createTestDb();
  const dao = new SqliteAccessKeyDao(db);
  const plainKey = createKey(dao, 'inactiveuser');

  // Deactivate the key
  db.prepare(
    'UPDATE solve_api_access_keys SET active = 0 WHERE username = ?',
  ).run('inactiveuser');

  const keyId = validateKey(dao, plainKey);
  assert.equal(keyId, null, 'validateKey should return null for an inactive key');

  const row = db
    .prepare('SELECT use_count FROM solve_api_access_keys WHERE username = ?')
    .get('inactiveuser');
  assert.equal(row.use_count, 0);

  db.close();
});
