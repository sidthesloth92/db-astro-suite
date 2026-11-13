import {
  StarLiftAnswer,
  StarLiftRequest,
} from '../models/star-lift-worker.model';
import { liftStars } from './star-lift.util';

/** True when a message received by the worker is a well-formed star-lift request. */
export function isStarLiftRequest(data: unknown): data is StarLiftRequest {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  // Justification for the cast: the object's shape is unknown; each field is checked below
  // before the value is trusted.
  const candidate = data as Partial<StarLiftRequest>;
  return (
    candidate.type === 'lift' &&
    typeof candidate.generationId === 'number' &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number' &&
    candidate.pixels instanceof ArrayBuffer &&
    candidate.pixels.byteLength === candidate.width * candidate.height * 4
  );
}

/**
 * The worker's whole job, as a pure function: turn one incoming message into the answer to
 * post back. Anything that is not a valid request is ignored (null). A valid request is lifted
 * and its scene's buffers listed for transfer; a failure becomes an error response.
 *
 * @param data - The `data` of a message received by the worker
 */
export function answerStarLiftRequest(data: unknown): StarLiftAnswer | null {
  if (!isStarLiftRequest(data)) {
    return null;
  }
  try {
    const scene = liftStars(new Uint8ClampedArray(data.pixels), data.width, data.height);
    return {
      response: { type: 'result', generationId: data.generationId, scene },
      transfer: [
        scene.photo.buffer,
        scene.starless.buffer,
        scene.cloudDepth.buffer,
        scene.atlas.buffer,
        scene.patches.buffer,
        scene.stars.buffer,
        scene.giants.buffer,
      ],
    };
  } catch (error) {
    return {
      response: {
        type: 'error',
        generationId: data.generationId,
        message: error instanceof Error ? error.message : String(error),
      },
      transfer: [],
    };
  }
}
