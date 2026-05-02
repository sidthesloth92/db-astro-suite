import crypto from 'crypto';
import { AccessKeyError } from './access-key.error.js';

/**
 * Hashes a plain-text key with SHA-256.
 * @param {string} plainKey
 * @returns {string} hex digest
 */
function hashKey(plainKey) {
  return crypto.createHash('sha256').update(plainKey).digest('hex');
}

/**
 * Generates a random 32-byte hex key, stores its hash, and returns the plain key.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} username
 * @returns {string} The generated plain-text key (only time it is ever visible)
 * @throws {AccessKeyError} If username already exists or insert fails
 */
export function createKey(db, username) {
  const plainKey = crypto.randomBytes(32).toString('hex');
  const keyHash = hashKey(plainKey);

  try {
    db.prepare(
      'INSERT INTO solve_api_access_keys (username, key_hash) VALUES (?, ?)',
    ).run(username, keyHash);
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      throw new AccessKeyError(`Username already exists: ${username}`);
    }
    throw new AccessKeyError(`Failed to create key for "${username}": ${err.message}`);
  }

  return plainKey;
}

/**
 * Deactivates the key for a given username (sets active = 0).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} username
 * @throws {AccessKeyError} If username is not found
 */
export function removeKey(db, username) {
  const result = db
    .prepare('UPDATE solve_api_access_keys SET active = 0 WHERE username = ?')
    .run(username);

  if (result.changes === 0) {
    throw new AccessKeyError(`User not found: ${username}`);
  }
}

/**
 * Returns all key records without hashes.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {{ username: string, created_at: string, active: number }[]}
 */
export function listKeys(db) {
  return db
    .prepare('SELECT username, created_at, active, use_count FROM solve_api_access_keys')
    .all();
}

/**
 * Validates a plain-text key against the stored hashes.
 * Returns the row id on success, or null if the key is invalid/inactive.
 * DB errors propagate — callers should catch and log them separately.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} plainKey
 * @returns {number | null} Row id if valid, null otherwise
 */
export function validateKey(db, plainKey) {
  if (!plainKey) return null;

  const keyHash = hashKey(plainKey);
  const row = db
    .prepare('SELECT id FROM solve_api_access_keys WHERE key_hash = ? AND active = 1')
    .get(keyHash);
  return row?.id ?? null;
}

/**
 * Atomically increments the use_count for the key with the given id.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 */
export function incrementUseCount(db, id) {
  db.prepare(
    'UPDATE solve_api_access_keys SET use_count = use_count + 1 WHERE id = ?',
  ).run(id);
}
