import { AccessKeyDao } from "./access-key.dao.js";
import { AccessKeyError } from "../errors.js";

/**
 * SQLite-backed implementation of {@link AccessKeyDao}.
 */
export class SqliteAccessKeyDao extends AccessKeyDao {
  #db;

  /**
   * @param db - Open better-sqlite3 database instance
   */
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
