/**
 * Shared base class for SQLite-backed DAO implementations.
 *
 * Handles the common database connection lifecycle: receiving an open
 * `better-sqlite3` Database instance, exposing it to subclasses via the
 * {@link SqliteBaseDao#db} accessor, and closing it on shutdown.
 */
export class SqliteBaseDao {
  #db;

  /**
   * @param db - Open better-sqlite3 database instance
   */
  constructor(db) {
    this.#db = db;
  }

  /**
   * The underlying better-sqlite3 Database connection.
   * Accessible to subclasses for query execution.
   */
  get db() {
    return this.#db;
  }

  /**
   * Closes the underlying database connection.
   *
   * @returns {void}
   */
  close() {
    this.#db.close();
  }
}
