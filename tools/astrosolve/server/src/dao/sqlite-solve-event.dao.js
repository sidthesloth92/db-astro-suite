import Database from "better-sqlite3";
import config from "../config.js";
import { SqliteBaseDao } from "./sqlite-base.dao.js";
import { SOLVE_EVENT_COLUMNS } from "../models/solve-event.model.js";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS solve_events (
    id                            INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at                    TEXT    NOT NULL DEFAULT (datetime('now')),
    request_id                    TEXT    NOT NULL,
    key_id                        INTEGER,
    client_ip                     TEXT,
    user_agent                    TEXT,
    outcome                       TEXT    NOT NULL,
    http_status                   INTEGER NOT NULL,
    response_code                 TEXT    NOT NULL,
    error_message                 TEXT,
    file_size_bytes               INTEGER,
    image_width_px                INTEGER,
    image_height_px               INTEGER,
    file_extension                TEXT,
    ra_hint_deg                   REAL,
    dec_hint_deg                  REAL,
    queue_depth_on_enqueue        INTEGER,
    queue_wait_ms                 INTEGER,
    solve_ra_deg                  REAL,
    solve_dec_deg                 REAL,
    solve_pixel_scale_arcsec_px   REAL,
    solve_field_width_arcmin      REAL,
    solve_field_height_arcmin     REAL,
    solve_field_rotation_deg      REAL,
    solve_match_count             INTEGER,
    solve_log_odds                REAL,
    solve_index_used              TEXT,
    solve_duration_ms             INTEGER,
    local_catalog_count           INTEGER,
    simbad_count                  INTEGER,
    simbad_available              INTEGER,
    objects_returned              INTEGER,
    total_duration_ms             INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_solve_events_created_at ON solve_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_solve_events_key_id     ON solve_events(key_id);
  CREATE INDEX IF NOT EXISTS idx_solve_events_outcome    ON solve_events(outcome);
`;

const INSERT_COLUMNS = SOLVE_EVENT_COLUMNS.join(", ");
const INSERT_PLACEHOLDERS = SOLVE_EVENT_COLUMNS.map((c) => `@${c}`).join(", ");
const INSERT_SQL = `INSERT INTO solve_events (${INSERT_COLUMNS}) VALUES (${INSERT_PLACEHOLDERS})`;

/**
 * SQLite-backed implementation of the SolveEventDao interface contract.
 * Stores per-request analytics rows. Uses the same `astrosolve.sqlite`
 * file as the access-keys DAO so a single mounted volume covers both.
 *
 * Use the static {@link SqliteSolveEventDao.create} factory for production.
 * Pass an in-memory `Database` to the constructor directly in tests.
 */
export class SqliteSolveEventDao extends SqliteBaseDao {
  #insertStmt;

  /**
   * @param {Database} db - Open better-sqlite3 database instance
   */
  constructor(db) {
    super(db);
    db.exec(CREATE_TABLE_SQL);
    this.#insertStmt = db.prepare(INSERT_SQL);
  }

  static create() {
    return new SqliteSolveEventDao(new Database(config.accessKeysDbPath));
  }

  /**
   * Inserts a single event. Unspecified columns are stored as NULL.
   *
   * @param {Object} event
   */
  insertEvent(event) {
    const row = {};
    for (const col of SOLVE_EVENT_COLUMNS) {
      row[col] = event[col] ?? null;
    }
    this.#insertStmt.run(row);
  }

  listRecent(limit) {
    return this.db
      .prepare(
        "SELECT * FROM solve_events ORDER BY id DESC LIMIT ?",
      )
      .all(limit);
  }

  listSince(since) {
    return this.db
      .prepare(
        "SELECT * FROM solve_events WHERE created_at >= ? ORDER BY id DESC",
      )
      .all(since);
  }

  listRecentFailures(limit) {
    return this.db
      .prepare(
        "SELECT * FROM solve_events WHERE outcome != 'success' ORDER BY id DESC LIMIT ?",
      )
      .all(limit);
  }

  iterateAll() {
    return this.db.prepare("SELECT * FROM solve_events ORDER BY id ASC").iterate();
  }
}
