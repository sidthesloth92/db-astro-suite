import crypto from "crypto";
import {
  insertAccessKey,
  deactivateAccessKey,
  listAccessKeys,
  findActiveKeyByHash,
  incrementKeyUseCount,
} from "./dao/access-key.dao.js";

/**
 * Hashes a plain-text key with SHA-256.
 *
 * @param {string} plainKey
 * @returns {string} Hex digest
 */
function hashKey(plainKey) {
  return crypto.createHash("sha256").update(plainKey).digest("hex");
}

/**
 * Generates a random 32-byte hex key, stores its hash, and returns the plain key.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} username
 * @returns {string} The generated plain-text key (only time it is ever visible)
 * @throws {import('./errors.js').AccessKeyError} If username already exists or insert fails
 */
export function createKey(db, username) {
  const plainKey = crypto.randomBytes(32).toString("hex");
  const keyHash = hashKey(plainKey);
  insertAccessKey(db, username, keyHash);
  return plainKey;
}

/**
 * Deactivates the key for a given username (sets active = 0).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} username
 * @throws {import('./errors.js').AccessKeyError} If username is not found
 */
export function removeKey(db, username) {
  deactivateAccessKey(db, username);
}

/**
 * Returns all key records without hashes.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {{ username: string, created_at: string, active: number, use_count: number }[]}
 */
export function listKeys(db) {
  return listAccessKeys(db);
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
  return findActiveKeyByHash(db, hashKey(plainKey));
}

/**
 * Atomically increments the use_count for the key with the given id.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 */
export function incrementUseCount(db, id) {
  incrementKeyUseCount(db, id);
}
