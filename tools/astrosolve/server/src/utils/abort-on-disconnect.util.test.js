/**
 * Unit tests for the client-disconnect → abort bridge. A fake `request.raw`
 * (a bare EventEmitter) and a `reply` stub are enough to exercise the wiring
 * without a live Fastify server.
 *
 * These tests call `abortOnClientDisconnect` directly without going through
 * multipart parsing, which mirrors how the route uses it: the function is
 * always called AFTER `parseMultipartRequest` so the false-positive `'close'`
 * from stream destruction has already fired before the listener is attached.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { abortOnClientDisconnect } from "./abort-on-disconnect.util.js";

describe("abortOnClientDisconnect", () => {
  it("aborts the signal when the client closes before the reply is sent", () => {
    const raw = new EventEmitter();
    const { signal } = abortOnClientDisconnect({ raw }, { sent: false });

    assert.equal(signal.aborted, false);
    raw.emit("close");
    assert.equal(signal.aborted, true);
  });

  it("does NOT abort when the reply has already been sent (normal completion)", () => {
    const raw = new EventEmitter();
    const { signal } = abortOnClientDisconnect({ raw }, { sent: true });

    raw.emit("close");
    assert.equal(signal.aborted, false);
  });

  it("dispose() removes the listener so a later close is a no-op", () => {
    const raw = new EventEmitter();
    const { signal, dispose } = abortOnClientDisconnect({ raw }, { sent: false });

    dispose();
    assert.equal(raw.listenerCount("close"), 0);
    raw.emit("close");
    assert.equal(signal.aborted, false);
  });
});
