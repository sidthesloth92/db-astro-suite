import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { SqliteSolveEventDao } from "./sqlite-solve-event.dao.js";

function newDao() {
  return new SqliteSolveEventDao(new Database(":memory:"));
}

function baseEvent(overrides = {}) {
  return {
    request_id: "req-test",
    outcome: "success",
    http_status: 200,
    response_code: "SOLVE_SUCCESS",
    total_duration_ms: 1234,
    ...overrides,
  };
}

test("insert + listRecent round-trips a fully populated row", () => {
  const dao = newDao();
  const diagnostics = JSON.stringify({
    simbad: {
      status: "http_error",
      http_status: 400,
      error_message: "Incorrect ADQL query",
      adql: "SELECT TOP 500 ...",
      elapsed_ms: 1240,
    },
  });
  const event = baseEvent({
    key_id: 7,
    client_ip: "1.2.3.4",
    user_agent: "curl/8.0",
    browser_name: "Mobile Safari",
    browser_version: "17.2",
    os_name: "iOS",
    os_version: "17.2",
    device_type: "mobile",
    error_message: null,
    file_size_bytes: 196965,
    image_width_px: 1080,
    image_height_px: 1350,
    file_extension: ".jpg",
    ra_hint_deg: 250.4,
    dec_hint_deg: 36.45,
    queue_depth_on_enqueue: 1,
    queue_wait_ms: 12,
    solve_ra_deg: 250.44,
    solve_dec_deg: 36.45,
    solve_pixel_scale_arcsec_px: 2.56,
    solve_field_width_arcmin: 46.07,
    solve_field_height_arcmin: 57.59,
    solve_field_rotation_deg: 20.82,
    solve_match_count: 11,
    solve_log_odds: 93.52,
    solve_index_used: "index-4109.fits",
    solve_duration_ms: 25800,
    solve_sources_found: 973,
    local_catalog_count: 3,
    simbad_count: 5,
    simbad_available: 1,
    objects_returned: 7,
    objects_returned_stars: 3,
    objects_returned_galaxies: 2,
    objects_returned_nebulae: 1,
    objects_returned_clusters: 1,
    objects_returned_other: 0,
    objects_returned_from_local: 3,
    objects_returned_from_simbad: 4,
    diagnostics,
  });
  dao.insertEvent(event);

  const rows = dao.listRecent(10);
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.request_id, "req-test");
  assert.equal(row.key_id, 7);
  assert.equal(row.client_ip, "1.2.3.4");
  assert.equal(row.file_size_bytes, 196965);
  assert.equal(row.image_width_px, 1080);
  assert.equal(row.solve_match_count, 11);
  assert.equal(row.solve_sources_found, 973);
  assert.equal(row.solve_index_used, "index-4109.fits");
  assert.equal(row.objects_returned, 7);
  assert.equal(row.outcome, "success");
  assert.ok(row.id > 0);
  assert.ok(typeof row.created_at === "string" && row.created_at.length > 0);

  // Parsed user-agent columns round-trip verbatim.
  assert.equal(row.browser_name, "Mobile Safari");
  assert.equal(row.browser_version, "17.2");
  assert.equal(row.os_name, "iOS");
  assert.equal(row.os_version, "17.2");
  assert.equal(row.device_type, "mobile");

  // New breakdown columns round-trip verbatim.
  assert.equal(row.objects_returned_stars, 3);
  assert.equal(row.objects_returned_galaxies, 2);
  assert.equal(row.objects_returned_nebulae, 1);
  assert.equal(row.objects_returned_clusters, 1);
  assert.equal(row.objects_returned_other, 0);
  assert.equal(row.objects_returned_from_local, 3);
  assert.equal(row.objects_returned_from_simbad, 4);

  // Invariant: per-type and per-source buckets each sum to objects_returned.
  const byType =
    row.objects_returned_stars +
    row.objects_returned_galaxies +
    row.objects_returned_nebulae +
    row.objects_returned_clusters +
    row.objects_returned_other;
  const bySource =
    row.objects_returned_from_local + row.objects_returned_from_simbad;
  assert.equal(byType, row.objects_returned);
  assert.equal(bySource, row.objects_returned);

  // Diagnostics blob round-trips byte-for-byte and parses as JSON.
  assert.equal(row.diagnostics, diagnostics);
  const parsed = JSON.parse(row.diagnostics);
  assert.equal(parsed.simbad.http_status, 400);
});

test("constructor is idempotent against a pre-existing DB", () => {
  // Simulate the production migration path: a DB created by an older
  // version of the schema gets reopened by the new code. The ALTER TABLE
  // migrations must skip already-present columns rather than throwing.
  const db = new Database(":memory:");
  // First open creates the table with the full current schema.
  // eslint-disable-next-line no-new
  new SqliteSolveEventDao(db);
  // Second open should be a no-op for the migrations — no throw means pass.
  assert.doesNotThrow(() => new SqliteSolveEventDao(db));
});

test("insert stores NULL for unspecified columns", () => {
  const dao = newDao();
  dao.insertEvent(
    baseEvent({
      outcome: "queue_full",
      http_status: 503,
      response_code: "SERVER_BUSY",
      queue_depth_on_enqueue: 10,
    }),
  );

  const [row] = dao.listRecent(1);
  assert.equal(row.outcome, "queue_full");
  assert.equal(row.queue_depth_on_enqueue, 10);
  assert.equal(row.key_id, null);
  assert.equal(row.file_size_bytes, null);
  assert.equal(row.solve_ra_deg, null);
  assert.equal(row.error_message, null);
  assert.equal(row.browser_name, null);
  assert.equal(row.browser_version, null);
  assert.equal(row.os_name, null);
  assert.equal(row.os_version, null);
  assert.equal(row.device_type, null);
});

test("listRecentFailures excludes successes", () => {
  const dao = newDao();
  dao.insertEvent(baseEvent({ outcome: "success", request_id: "ok" }));
  dao.insertEvent(
    baseEvent({
      outcome: "validation_error",
      http_status: 400,
      response_code: "VALIDATION_ERROR",
      request_id: "bad",
    }),
  );
  dao.insertEvent(
    baseEvent({
      outcome: "solve_failed",
      http_status: 500,
      response_code: "SOLVE_FAILED",
      request_id: "fail",
    }),
  );

  const failures = dao.listRecentFailures(10);
  assert.equal(failures.length, 2);
  const requestIds = failures.map((r) => r.request_id);
  assert.ok(!requestIds.includes("ok"));
  assert.ok(requestIds.includes("bad"));
  assert.ok(requestIds.includes("fail"));
});

test("listSince filters by created_at", () => {
  const dao = newDao();
  // Insert two rows directly with explicit created_at so we can test the cutoff
  dao.db
    .prepare(
      "INSERT INTO solve_events (request_id, created_at, outcome, http_status, response_code, total_duration_ms) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run("old", "2020-01-01 00:00:00", "success", 200, "SOLVE_SUCCESS", 1);
  dao.db
    .prepare(
      "INSERT INTO solve_events (request_id, created_at, outcome, http_status, response_code, total_duration_ms) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run("new", "2099-01-01 00:00:00", "success", 200, "SOLVE_SUCCESS", 1);

  const rows = dao.listSince("2025-01-01 00:00:00");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].request_id, "new");
});
