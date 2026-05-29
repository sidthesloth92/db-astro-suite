import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUserAgent } from "./user-agent.util.js";

const EXPECTED_KEYS = [
  "browser_name",
  "browser_version",
  "os_name",
  "os_version",
  "device_type",
];

function assertShape(result) {
  for (const key of EXPECTED_KEYS) {
    assert.ok(
      key in result,
      `expected key "${key}" to be present on parsed result`,
    );
    const v = result[key];
    assert.ok(
      v === null || typeof v === "string",
      `expected "${key}" to be string or null, got ${typeof v}`,
    );
    assert.notEqual(v, "", `expected "${key}" to never be empty string`);
    assert.notEqual(v, undefined, `expected "${key}" to never be undefined`);
  }
}

test("parses iPhone Safari into mobile + iOS", () => {
  const ua =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
  const r = parseUserAgent(ua);
  assertShape(r);
  assert.equal(r.os_name, "iOS");
  assert.ok(r.os_version?.startsWith("17"));
  assert.ok(r.browser_name?.includes("Safari"));
  assert.equal(r.device_type, "mobile");
});

test("parses Android Chrome into mobile + Android", () => {
  const ua =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36";
  const r = parseUserAgent(ua);
  assertShape(r);
  assert.equal(r.os_name, "Android");
  assert.ok(r.os_version?.startsWith("14"));
  assert.ok(r.browser_name?.includes("Chrome"));
  assert.equal(r.device_type, "mobile");
});

test("parses desktop Chrome on Windows as desktop", () => {
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const r = parseUserAgent(ua);
  assertShape(r);
  assert.equal(r.os_name, "Windows");
  assert.ok(r.browser_name?.includes("Chrome"));
  assert.equal(r.device_type, "desktop");
});

test("parses desktop Safari on macOS as desktop", () => {
  const ua =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15";
  const r = parseUserAgent(ua);
  assertShape(r);
  assert.equal(r.os_name, "macOS");
  assert.ok(r.browser_name?.includes("Safari"));
  assert.equal(r.device_type, "desktop");
});

test("parses Firefox on Linux as desktop", () => {
  const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0";
  const r = parseUserAgent(ua);
  assertShape(r);
  assert.equal(r.os_name, "Linux");
  assert.ok(r.browser_name?.includes("Firefox"));
  assert.equal(r.device_type, "desktop");
});

test("returns all-null shape for null/undefined/empty input", () => {
  for (const input of [null, undefined, ""]) {
    const r = parseUserAgent(input);
    assertShape(r);
    assert.equal(r.browser_name, null);
    assert.equal(r.browser_version, null);
    assert.equal(r.os_name, null);
    assert.equal(r.os_version, null);
    assert.equal(r.device_type, null);
  }
});

test("returns all-null shape for non-string input", () => {
  // Defensive: a misbehaving caller passes a non-string. Should not throw.
  const r = parseUserAgent(/** @type {any} */ (12345));
  assertShape(r);
  assert.equal(r.browser_name, null);
  assert.equal(r.device_type, null);
});

test("garbage UA yields nulls without throwing", () => {
  const r = parseUserAgent("zzzzzzzzzzzzzzzzzzzz");
  assertShape(r);
  // We don't assert specifics — only that the function doesn't throw and the
  // shape is intact. Garbage may yield mostly-null values; that is acceptable.
});
