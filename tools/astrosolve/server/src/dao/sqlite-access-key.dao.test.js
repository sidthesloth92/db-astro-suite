import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { SqliteAccessKeyDao } from "./sqlite-access-key.dao.js";
import { AccessKeyError } from "../models/errors.model.js";
import crypto from "crypto";

function hash(plain) {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

function newDao() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE solve_api_access_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      key_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      active INTEGER NOT NULL DEFAULT 1,
      use_count INTEGER NOT NULL DEFAULT 0
    )
  `);
  return new SqliteAccessKeyDao(db);
}

// ── insertAccessKey ────────────────────────────────────────────────────────────

test("insertAccessKey creates a row with active = 1 by default", () => {
  const dao = newDao();
  dao.insertAccessKey("alice", hash("plainkey"));
  const row = dao.db
    .prepare("SELECT * FROM solve_api_access_keys WHERE username = ?")
    .get("alice");
  assert.equal(row.active, 1);
  assert.equal(row.use_count, 0);
});

test("insertAccessKey throws AccessKeyError on duplicate username", () => {
  const dao = newDao();
  dao.insertAccessKey("bob", hash("key1"));
  assert.throws(
    () => dao.insertAccessKey("bob", hash("key2")),
    (err) =>
      err instanceof AccessKeyError && /already exists/i.test(err.message),
  );
});

// ── deactivateAccessKey ───────────────────────────────────────────────────────

test("deactivateAccessKey sets active = 0", () => {
  const dao = newDao();
  dao.insertAccessKey("carol", hash("plainkey"));
  dao.deactivateAccessKey("carol");
  const row = dao.db
    .prepare("SELECT active FROM solve_api_access_keys WHERE username = ?")
    .get("carol");
  assert.equal(row.active, 0);
});

test("deactivateAccessKey throws AccessKeyError for unknown username", () => {
  const dao = newDao();
  assert.throws(
    () => dao.deactivateAccessKey("nobody"),
    (err) =>
      err instanceof AccessKeyError && /not found/i.test(err.message),
  );
});

// ── rotateAccessKey ───────────────────────────────────────────────────────────

test("rotateAccessKey replaces key_hash", () => {
  const dao = newDao();
  const h1 = hash("old-key");
  const h2 = hash("new-key");
  dao.insertAccessKey("dave", h1);
  dao.rotateAccessKey("dave", h2);
  const row = dao.db
    .prepare("SELECT key_hash FROM solve_api_access_keys WHERE username = ?")
    .get("dave");
  assert.equal(row.key_hash, h2);
});

test("rotateAccessKey sets active = 1 even when the key was previously deactivated", () => {
  const dao = newDao();
  dao.insertAccessKey("eve", hash("original"));
  dao.deactivateAccessKey("eve");

  // Sanity: confirm the key is inactive before rotating.
  const before = dao.db
    .prepare("SELECT active FROM solve_api_access_keys WHERE username = ?")
    .get("eve");
  assert.equal(before.active, 0, "key should be inactive after deactivation");

  dao.rotateAccessKey("eve", hash("new-key"));

  const after = dao.db
    .prepare("SELECT active FROM solve_api_access_keys WHERE username = ?")
    .get("eve");
  assert.equal(after.active, 1, "rotate must reactivate a deactivated key");
});

test("rotateAccessKey throws AccessKeyError for unknown username", () => {
  const dao = newDao();
  assert.throws(
    () => dao.rotateAccessKey("nobody", hash("x")),
    (err) =>
      err instanceof AccessKeyError && /not found/i.test(err.message),
  );
});

// ── findActiveKeyByHash ───────────────────────────────────────────────────────

test("findActiveKeyByHash returns the row id for an active key", () => {
  const dao = newDao();
  const h = hash("my-key");
  dao.insertAccessKey("frank", h);
  const id = dao.findActiveKeyByHash(h);
  assert.ok(typeof id === "number" && id > 0);
});

test("findActiveKeyByHash returns null for an inactive key", () => {
  const dao = newDao();
  const h = hash("my-key");
  dao.insertAccessKey("grace", h);
  dao.deactivateAccessKey("grace");
  assert.equal(dao.findActiveKeyByHash(h), null);
});

test("findActiveKeyByHash returns null for an unknown hash", () => {
  const dao = newDao();
  assert.equal(dao.findActiveKeyByHash(hash("unknown")), null);
});

// ── incrementKeyUseCount ──────────────────────────────────────────────────────

test("incrementKeyUseCount bumps use_count by 1", () => {
  const dao = newDao();
  dao.insertAccessKey("henry", hash("k"));
  const { id } = dao.db
    .prepare("SELECT id FROM solve_api_access_keys WHERE username = ?")
    .get("henry");
  dao.incrementKeyUseCount(id);
  dao.incrementKeyUseCount(id);
  const row = dao.db
    .prepare("SELECT use_count FROM solve_api_access_keys WHERE id = ?")
    .get(id);
  assert.equal(row.use_count, 2);
});
