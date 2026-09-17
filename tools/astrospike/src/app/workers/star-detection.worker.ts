import { DETECTION_OPTIONS } from '../constants/detection.constants';
import { DetectionRequest, DetectionResponse } from '../models/detection-worker.model';
import { detectStars } from '../utils/star-detection.util';

/**
 * Star detection Web Worker — dispatch only. Validates the incoming
 * {@link DetectionRequest}, runs the pure `detectStars` pipeline, and posts a
 * {@link DetectionResponse} echoing the request's generation id. All detection
 * logic lives in the utils; this file only marshals messages.
 */

// Justification for the cast: the app tsconfig compiles with the DOM lib (no
// `webworker` lib), so the dedicated-worker global scope is typed as `Window`.
// This minimal cast types exactly the two members the worker uses, with the
// worker-scope `postMessage(message)` signature.
const workerScope = self as unknown as {
  postMessage(message: DetectionResponse): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
};

workerScope.addEventListener('message', (event: MessageEvent) => {
  // Justification for the cast: `MessageEvent#data` is untyped; the shape is
  // validated against the worker message protocol before any use.
  const request = event.data as DetectionRequest;
  if (
    !request ||
    request.type !== 'detect' ||
    !(request.pixels instanceof ArrayBuffer) ||
    typeof request.width !== 'number' ||
    typeof request.height !== 'number'
  ) {
    return;
  }

  try {
    const pixels = new Uint8ClampedArray(request.pixels);
    const stars = detectStars(pixels, request.width, request.height, DETECTION_OPTIONS);
    workerScope.postMessage({ type: 'result', generationId: request.generationId, stars });
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      generationId: request.generationId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
