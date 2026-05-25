import Database from "better-sqlite3";
import config from "../config.js";
import { SqliteBaseDao } from "./sqlite-base.dao.js";
import { idempotentAlter } from "./sqlite-migration.util.js";
import { AccessKeyError } from "../models/errors.model.js";

/**
 * SQLite-backed implementation of the AccessKeyDao interface contract.
 * Extends {@link SqliteBaseDao} for shared database lifecycle management.
 *
 * Use the static {@link SqliteAccessKeyDao.create} factory for production.
 * Pass an in-memory `Database` to the constructor directly in tests.
 */
export class SqliteAccessKeyDao extends SqliteBaseDao {
  /**
   * @param {Database} db - Open better-sqlite3 database instance
   */
  constructor(db) {
    super(db);
  }

  /**
   * Opens the SQLite database at the path specified in config, runs schema
   * creation and migrations, and returns a ready-to-use dao instance.
   *
   * @returns {SqliteAccessKeyDao}
   */
  static create() {
    const db = new Database(config.accessKeysDbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS solve_api_access_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        key_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        active INTEGER NOT NULL DEFAULT 1,
        use_count INTEGER NOT NULL DEFAULT 0
      )
    `);
    idempotentAlter(
      db,
      "ALTER TABLE solve_api_access_keys ADD COLUMN use_count INTEGER NOT NULL DEFAULT 0",
    );
    return new SqliteAccessKeyDao(db);
  }

  /**
   * @param {string} username
   * @param {string} keyHash
   * @returns {void}
   * @throws {AccessKeyError}
   */
  insertAccessKey(username, keyHash) {
    try {
      this.db
        .prepare(
          "INSERT INTO solve_api_access_keys (username, key_hash) VALUES (?, ?)",
        )
        .run(username, keyHash);
    } catch (err) {
      // better-sqlite3 exposes a stable `code` for UNIQUE-constraint
      // violations; the message-match is kept only as a defensive fallback
      // in case the library ever changes the code string.
      if (
        err.code === "SQLITE_CONSTRAINT_UNIQUE" ||
        err.message?.includes("UNIQUE constraint failed")
      ) {
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
    const result = this.db
      .prepare("UPDATE solve_api_access_keys SET active = 0 WHERE username = ?")
      .run(username);

    if (result.changes === 0) {
      throw new AccessKeyError(`User not found: ${username}`);
    }
  }

  /**
   * @param {string} username
   * @param {string} newKeyHash
   * @returns {void}
   * @throws {AccessKeyError}
   */
  rotateAccessKey(username, newKeyHash) {
    const result = this.db
      .prepare(
        "UPDATE solve_api_access_keys SET key_hash = ?, active = 1 WHERE username = ?",
      )
      .run(newKeyHash, username);

    if (result.changes === 0) {
      throw new AccessKeyError(`User not found: ${username}`);
    }
  }

  /**
   * @returns {{ id: number, username: string, created_at: string, active: number, use_count: number }[]}
   */
  listAccessKeys() {
    return this.db
      .prepare(
        "SELECT id, username, created_at, active, use_count FROM solve_api_access_keys",
      )
      .all();
  }

  /**
   * @param {string} keyHash
   * @returns {number | null}
   */
  findActiveKeyByHash(keyHash) {
    const row = this.db
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
    this.db
      .prepare(
        "UPDATE solve_api_access_keys SET use_count = use_count + 1 WHERE id = ?",
      )
      .run(id);
  }
}
