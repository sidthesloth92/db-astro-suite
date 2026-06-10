/**
 * Unit tests for the orphaned-upload sweeper. `sweepOrphans` is exercised
 * deterministically against a real temp directory with a backdated mtime, so no
 * timing dependence creeps in.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sweepOrphans, startUploadsSweeper } from "./uploads-sweeper.util.js";

describe("sweepOrphans", () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "astrosolve-sweep-"));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("deletes files older than maxAgeMs and keeps fresh ones", async () => {
    const oldFile = path.join(dir, "old.jpg");
    const freshFile = path.join(dir, "fresh.jpg");
    await fs.writeFile(oldFile, "x");
    await fs.writeFile(freshFile, "y");
    const hourAgo = new Date(Date.now() - 3_600_000);
    await fs.utimes(oldFile, hourAgo, hourAgo);

    const deleted = await sweepOrphans({ dir, maxAgeMs: 60_000 });

    assert.deepEqual(deleted, [oldFile]);
    await assert.rejects(fs.access(oldFile));
    await fs.access(freshFile); // still present — would throw if deleted
  });

  it("returns an empty list and does not throw when the directory is missing", async () => {
    const deleted = await sweepOrphans({
      dir: path.join(dir, "nope"),
      maxAgeMs: 1000,
    });
    assert.deepEqual(deleted, []);
  });
});

describe("startUploadsSweeper", () => {
  it("returns a stop() that clears the interval without throwing", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "astrosolve-sweep-"));
    const stop = startUploadsSweeper({
      dir,
      maxAgeMs: 1000,
      intervalMs: 10_000,
    });
    assert.equal(typeof stop, "function");
    stop();
    await fs.rm(dir, { recursive: true, force: true });
  });
});
