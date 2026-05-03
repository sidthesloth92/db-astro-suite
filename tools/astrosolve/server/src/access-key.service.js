import crypto from "crypto";
import { SqliteAccessKeyDao } from "./dao/access-key.dao.js";

/** @typedef {import('./dao/access-key.dao.js').AccessKeyDao} AccessKeyDao */
/** @typedef {import('./errors.js').AccessKeyError} AccessKeyError */

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
 * @param {AccessKeyDao} dao
 * @param {string} username
 * @returns {string} The generated plain-text key (only time it is ever visible)
 * @throws {AccessKeyError} If username already exists or insert fails
 */
export function createKey(dao, username) {
  const plainKey = crypto.randomBytes(32).toString("hex");
  const keyHash = hashKey(plainKey);
  dao.insertAccessKey(username, keyHash);
  return plainKey;
}

/**
 * Deactivates the key for a given username (sets active = 0).
 *
 * @param {AccessKeyDao} dao
 * @param {string} username
 * @throws {AccessKeyError} If username is not found
 */
export function removeKey(dao, username) {
  dao.deactivateAccessKey(username);
}

/**
 * Returns all key records without hashes.
 *
 * @param {AccessKeyDao} dao
 * @returns {{ username: string, created_at: string, active: number, use_count: number }[]}
 */
export function listKeys(dao) {
  return dao.listAccessKeys();
}

/**
 * Validates a plain-text key against the stored hashes.
 * Returns the row id on success, or null if the key is invalid/inactive.
 * DB errors propagate — callers should catch and log them separately.
 *
 * @param {AccessKeyDao} dao
 * @param {string} plainKey
 * @returns {number | null} Row id if valid, null otherwise
 */
export function validateKey(dao, plainKey) {
  if (!plainKey) return null;
  return dao.findActiveKeyByHash(hashKey(plainKey));
}

/**
 * Atomically increments the use_count for the key with the given id.
 *
 * @param {AccessKeyDao} dao
 * @param {number} id
 */
export function incrementUseCount(dao, id) {
  dao.incrementKeyUseCount(id);
}

// Re-export SqliteAccessKeyDao for callers that need to construct one
export { SqliteAccessKeyDao };
