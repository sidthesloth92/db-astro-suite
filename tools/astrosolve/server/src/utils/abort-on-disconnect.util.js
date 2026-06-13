/**
 * Wires an {@link AbortController} to the client's connection so that a solve
 * in progress (or still queued) is abandoned the moment the client disconnects.
 *
 * Fastify does not abort a handler when the socket closes — the work runs to
 * completion regardless, wasting a queue slot for a caller who has already left.
 * This bridges `request.raw`'s `'close'` event to an abort signal that callers
 * pass into `solveQueue.add(fn, { signal })` (drops a not-yet-started task and
 * frees the slot immediately) and into the solve pipeline (kills the running
 * process group).
 *
 * **Must be called AFTER the multipart body is fully consumed.** Node's stream
 * `pipeline` (used by the upload service) calls `destroy()` on the
 * `IncomingMessage` when the body is read, which emits `'close'` as a normal
 * lifecycle event — not a client disconnect. Adding this listener before that
 * point produces a false positive that aborts every solve immediately. Calling
 * it after multipart parsing means the false-positive `'close'` has already
 * fired and gone; only a genuine connection tear-down triggers the abort.
 *
 * The signal is only raised on a *premature* close: if the response has already
 * been sent (`reply.sent`), the `'close'` is the normal end of the request and
 * is ignored.
 *
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 * @returns {{ signal: AbortSignal, dispose: () => void }} The abort signal plus a
 *   `dispose()` that removes the listener (call it in the handler's `finally`).
 */
export function abortOnClientDisconnect(request, reply) {
  const controller = new AbortController();

  const onClose = () => {
    if (!reply.sent) {
      controller.abort();
    }
  };

  request.raw.on("close", onClose);

  return {
    signal: controller.signal,
    dispose: () => request.raw.removeListener("close", onClose),
  };
}
