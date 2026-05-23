import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../config.js";
import { SolveError } from "../models/errors.model.js";
import {
  validateMagicBytes,
  validateDimensions,
  validateImageReceived,
  validateAndExtractHints,
} from "./upload.service.js";

// --- validateMagicBytes -----------------------------------------------------

test("validateMagicBytes accepts a valid JPEG signature", () => {
  const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
  assert.doesNotThrow(() => validateMagicBytes(buf, ".jpg"));
  assert.doesNotThrow(() => validateMagicBytes(buf, ".jpeg"));
});

test("validateMagicBytes accepts a valid PNG signature", () => {
  const buf = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
  ]);
  assert.doesNotThrow(() => validateMagicBytes(buf, ".png"));
});

test("validateMagicBytes rejects a GIF renamed as .jpg", () => {
  // GIF87a header — common spoofing target
  const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
  assert.throws(
    () => validateMagicBytes(buf, ".jpg"),
    (err) =>
      err instanceof SolveError &&
      err.statusCode === 400 &&
      /do not match/i.test(err.message),
  );
});

test("validateMagicBytes rejects a JPEG renamed as .png", () => {
  const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  assert.throws(
    () => validateMagicBytes(buf, ".png"),
    (err) => err instanceof SolveError && err.statusCode === 400,
  );
});

test("validateMagicBytes rejects an extension with no signature registered", () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  assert.throws(
    () => validateMagicBytes(buf, ".tiff"),
    (err) => err instanceof SolveError && /No content signature/.test(err.message),
  );
});

// --- validateDimensions -----------------------------------------------------

test("validateDimensions accepts dimensions inside the configured range", () => {
  assert.doesNotThrow(() =>
    validateDimensions({ width: config.uploadMinDimension, height: config.uploadMinDimension }),
  );
  assert.doesNotThrow(() =>
    validateDimensions({ width: config.uploadMaxDimension, height: config.uploadMaxDimension }),
  );
});

test("validateDimensions rejects dimensions below the minimum", () => {
  assert.throws(
    () => validateDimensions({ width: config.uploadMinDimension - 1, height: 2000 }),
    (err) =>
      err instanceof SolveError &&
      err.statusCode === 400 &&
      /too low/i.test(err.message),
  );
});

test("validateDimensions rejects dimensions above the maximum", () => {
  assert.throws(
    () => validateDimensions({ width: 2000, height: config.uploadMaxDimension + 1 }),
    (err) =>
      err instanceof SolveError &&
      err.statusCode === 400 &&
      /too high/i.test(err.message),
  );
});

test("validateDimensions rejects null / empty inputs", () => {
  assert.throws(
    () => validateDimensions(null),
    (err) => err instanceof SolveError && err.statusCode === 400,
  );
  assert.throws(
    () => validateDimensions({ width: 0, height: 0 }),
    (err) => err instanceof SolveError && err.statusCode === 400,
  );
});

// --- validateImageReceived --------------------------------------------------

test("validateImageReceived rejects a missing file", () => {
  assert.throws(
    () => validateImageReceived(null),
    (err) => err instanceof SolveError && /Missing 'image' file/.test(err.message),
  );
  assert.throws(
    () => validateImageReceived({ file: null, filename: "x.jpg" }),
    (err) => err instanceof SolveError && err.statusCode === 400,
  );
});

test("validateImageReceived rejects disallowed extensions", () => {
  assert.throws(
    () => validateImageReceived({ file: {}, filename: "image.gif" }),
    (err) =>
      err instanceof SolveError &&
      err.statusCode === 400 &&
      /Invalid file extension/.test(err.message),
  );
});

test("validateImageReceived accepts allowed extensions case-insensitively", () => {
  assert.doesNotThrow(() =>
    validateImageReceived({ file: {}, filename: "image.JPG" }),
  );
  assert.doesNotThrow(() =>
    validateImageReceived({ file: {}, filename: "shot.PNG" }),
  );
});

// --- validateAndExtractHints ------------------------------------------------

test("validateAndExtractHints parses numeric ra/dec hints and trims types", () => {
  const fields = {
    types: { value: "  star , galaxy  ,nebula " },
    ra_hint: { value: "12.34" },
    dec_hint: { value: "-5.67" },
  };
  const hints = validateAndExtractHints(fields);
  assert.deepEqual(hints.types, ["star", "galaxy", "nebula"]);
  assert.equal(hints.ra_hint, 12.34);
  assert.equal(hints.dec_hint, -5.67);
  assert.equal(hints.min_magnitude, 20);
});

test("validateAndExtractHints leaves ra/dec null when not finite", () => {
  const hints = validateAndExtractHints({
    ra_hint: { value: "not-a-number" },
    dec_hint: { value: "abc" },
  });
  assert.equal(hints.ra_hint, null);
  assert.equal(hints.dec_hint, null);
  assert.deepEqual(hints.types, []);
});
