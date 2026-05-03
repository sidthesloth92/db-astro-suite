import { AccessKeyError } from "../errors.js";

/**
 * Inserts a new access key record into the database.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} username
 * @param {string} keyHash - SHA-256 hex digest of the plain-text key
 * @returns {void}
 * @throws {AccessKeyError} If the username already exists
 */
export function insertAccessKey(db, username, keyHash) {
  try {
    db.prepare(
      "INSERT INTO solve_api_access_keys (username, key_hash) VALUES (?, ?)",
    ).run(username, keyHash);
  } catch (err) {
    if (err.message?.includes("UNIQUE constraint failed")) {
      throw new AccessKeyError(`Username already exists: ${username}`);
    }
    throw new AccessKeyError(
      `Failed to create key for "${username}": ${err.message}`,
    );
  }
}

/**
 * Deactivates the key for the given username (sets active = 0).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} username
 * @returns {void}
 * @throws {AccessKeyError} If the username is not found
 */
export function deactivateAccessKey(db, username) {
  const result = db
    .prepare("UPDATE solve_api_access_keys SET active = 0 WHERE username = ?")
    .run(username);

  if (result.changes === 0) {
    throw new AccessKeyError(`User not found: ${username}`);
  }
}

/**
 * Returns all key records (without hashes).
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {{ username: string, created_at: string, active: number, use_count: number }[]}
 */
export function listAccessKeys(db) {
  return db
    .prepare(
      "SELECT username, created_at, active, use_count FROM solve_api_access_keys",
    )
    .all();
}

/**
 * Finds an active key record by its SHA-256 hash.
 * Returns the row id on match, or null if not found or inactive.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} keyHash - SHA-256 hex digest
 * @returns {number | null} Row id if a matching active key exists, null otherwise
 */
export function findActiveKeyByHash(db, keyHash) {
  const row = db
    .prepare(
      "SELECT id FROM solve_api_access_keys WHERE key_hash = ? AND active = 1",
    )
    .get(keyHash);
  return row?.id ?? null;
}

/**
 * Atomically increments the use_count for the key with the given row id.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} id - The row id of the access key record
 * @returns {void}
 */
export function incrementKeyUseCount(db, id) {
  db.prepare(
    "UPDATE solve_api_access_keys SET use_count = use_count + 1 WHERE id = ?",
  ).run(id);
}
