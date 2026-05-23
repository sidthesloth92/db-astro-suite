import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { idempotentAlter } from "./sqlite-migration.util.js";

test("idempotentAlter adds the column when it does not exist", () => {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY)");
  idempotentAlter(db, "ALTER TABLE t ADD COLUMN extra INTEGER");

  const cols = db.prepare("PRAGMA table_info(t)").all().map((c) => c.name);
  assert.ok(cols.includes("extra"));
});

test("idempotentAlter is a no-op when the column already exists", () => {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, extra INTEGER)");
  assert.doesNotThrow(() =>
    idempotentAlter(db, "ALTER TABLE t ADD COLUMN extra INTEGER"),
  );
});

test("idempotentAlter re-throws non-duplicate-column errors", () => {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY)");
  assert.throws(() =>
    idempotentAlter(db, "ALTER TABLE not_a_real_table ADD COLUMN x INTEGER"),
  );
});
