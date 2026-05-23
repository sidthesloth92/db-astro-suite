/**
 * Shared helpers for idempotent SQLite schema migrations.
 *
 * SQLite has no `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and better-sqlite3
 * does not surface a dedicated error code for the "duplicate column name"
 * case — only the message. We centralise the message-match here so each DAO
 * does not re-implement (and risk diverging on) the same defensive try/catch.
 */

/**
 * Runs an `ALTER TABLE ... ADD COLUMN` statement once. If the column already
 * exists (SQLite raises `SqliteError: duplicate column name: ...`), the call
 * is treated as a no-op. Any other error is re-thrown verbatim so genuine
 * migration failures still surface at startup.
 *
 * @param {import('better-sqlite3').Database} db - Open database instance
 * @param {string} ddl - The full `ALTER TABLE ... ADD COLUMN ...` SQL
 * @returns {void}
 */
export function idempotentAlter(db, ddl) {
  try {
    db.exec(ddl);
  } catch (err) {
    if (!err.message?.includes("duplicate column name")) {
      throw err;
    }
  }
}
