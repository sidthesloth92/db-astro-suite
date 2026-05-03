import { AccessKeyError } from "../errors.js";

/**
 * Abstract base DAO for access key operations.
 * Concrete implementations (e.g. SqliteAccessKeyDao) must override all methods.
 */
export class AccessKeyDao {
  /**
   * Inserts a new access key record.
   *
   * @param {string} username
   * @param {string} keyHash - SHA-256 hex digest of the plain-text key
   * @returns {void}
   * @throws {AccessKeyError} If the username already exists
   */
  // eslint-disable-next-line no-unused-vars
  insertAccessKey(username, keyHash) {
    throw new Error("Not implemented");
  }

  /**
   * Deactivates the key for the given username (sets active = 0).
   *
   * @param {string} username
   * @returns {void}
   * @throws {AccessKeyError} If the username is not found
   */
  // eslint-disable-next-line no-unused-vars
  deactivateAccessKey(username) {
    throw new Error("Not implemented");
  }

  /**
   * Returns all key records (without hashes).
   *
   * @returns {{ username: string, created_at: string, active: number, use_count: number }[]}
   */
  listAccessKeys() {
    throw new Error("Not implemented");
  }

  /**
   * Finds an active key record by its SHA-256 hash.
   * Returns the row id on match, or null if not found or inactive.
   *
   * @param {string} keyHash - SHA-256 hex digest
   * @returns {number | null} Row id if a matching active key exists, null otherwise
   */
  // eslint-disable-next-line no-unused-vars
  findActiveKeyByHash(keyHash) {
    throw new Error("Not implemented");
  }

  /**
   * Atomically increments the use_count for the key with the given row id.
   *
   * @param {number} id - The row id of the access key record
   * @returns {void}
   */
  // eslint-disable-next-line no-unused-vars
  incrementKeyUseCount(id) {
    throw new Error("Not implemented");
  }
}

/**
 * SQLite-backed implementation of {@link AccessKeyDao}.
 */
export class SqliteAccessKeyDao extends AccessKeyDao {
  /** @type {import('better-sqlite3').Database} */
  #db;

  /** @param {import('better-sqlite3').Database} db */
  constructor(db) {
    super();
    this.#db = db;
  }

  /**
   * @param {string} username
   * @param {string} keyHash
   * @returns {void}
   * @throws {AccessKeyError}
   */
  insertAccessKey(username, keyHash) {
    try {
      this.#db
        .prepare(
          "INSERT INTO solve_api_access_keys (username, key_hash) VALUES (?, ?)",
        )
        .run(username, keyHash);
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
   * @param {string} username
   * @returns {void}
   * @throws {AccessKeyError}
   */
  deactivateAccessKey(username) {
    const result = this.#db
      .prepare("UPDATE solve_api_access_keys SET active = 0 WHERE username = ?")
      .run(username);

    if (result.changes === 0) {
      throw new AccessKeyError(`User not found: ${username}`);
    }
  }

  /** @returns {{ username: string, created_at: string, active: number, use_count: number }[]} */
  listAccessKeys() {
    return this.#db
      .prepare(
        "SELECT username, created_at, active, use_count FROM solve_api_access_keys",
      )
      .all();
  }

  /**
   * @param {string} keyHash
   * @returns {number | null}
   */
  findActiveKeyByHash(keyHash) {
    const row = this.#db
      .prepare(
        "SELECT id FROM solve_api_access_keys WHERE key_hash = ? AND active = 1",
      )
      .get(keyHash);
    return row?.id ?? null;
  }

  /**
   * @param {number} id
   * @returns {void}
   */
  incrementKeyUseCount(id) {
    this.#db
      .prepare(
        "UPDATE solve_api_access_keys SET use_count = use_count + 1 WHERE id = ?",
      )
      .run(id);
  }
}
