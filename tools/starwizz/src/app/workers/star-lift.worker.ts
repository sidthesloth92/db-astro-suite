import { StarLiftRequest, StarLiftResponse } from '../models/star-lift-worker.model';
import { liftStars } from '../utils/star-lift.util';

/**
 * Star-lift Web Worker: dispatch only. Validates the incoming {@link StarLiftRequest}, runs
 * the pure `liftStars` pipeline and posts a {@link StarLiftResponse} echoing the request's
 * generation id. The scene's buffers are transferred back, never copied.
 */

// Justification for the cast: the app tsconfig compiles with the DOM lib (no `webworker` lib),
// so the dedicated-worker global scope is typed as `Window`. This minimal cast types exactly
// the two members the worker uses, with the worker-scope `postMessage` signature.
const workerScope = self as unknown as {
  postMessage(message: StarLiftResponse, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
};

workerScope.addEventListener('message', (event: MessageEvent) => {
  // Justification for the cast: `MessageEvent#data` is untyped; the shape is validated against
  // the worker message protocol before any use.
  const request = event.data as StarLiftRequest;
  if (
    !request ||
    request.type !== 'lift' ||
    !(request.pixels instanceof ArrayBuffer) ||
    typeof request.width !== 'number' ||
    typeof request.height !== 'number'
  ) {
    return;
  }

  try {
    const scene = liftStars(new Uint8ClampedArray(request.pixels), request.width, request.height);
    workerScope.postMessage({ type: 'result', generationId: request.generationId, scene }, [
      scene.photo.buffer,
      scene.starless.buffer,
      scene.cloudDepth.buffer,
      scene.atlas.buffer,
      scene.patches.buffer,
      scene.stars.buffer,
      scene.giants.buffer,
    ]);
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      generationId: request.generationId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
