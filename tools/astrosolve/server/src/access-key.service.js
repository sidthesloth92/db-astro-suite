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
      'INSERT INTO access_keys (username, key_hash) VALUES (?, ?)',
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
    .prepare('UPDATE access_keys SET active = 0 WHERE username = ?')
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
    .prepare('SELECT username, created_at, active FROM access_keys')
    .all();
}

/**
 * Validates a plain-text key against the stored hashes.
 * Returns false (never throws) so callers do not need a try/catch for invalid keys.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} plainKey
 * @returns {boolean}
 */
export function validateKey(db, plainKey) {
  if (!plainKey) return false;

  try {
    const keyHash = hashKey(plainKey);
    const row = db
      .prepare('SELECT id FROM access_keys WHERE key_hash = ? AND active = 1')
      .get(keyHash);
    return row != null;
  } catch {
    return false;
  }
}
