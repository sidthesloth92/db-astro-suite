import { StarLiftResponse } from '../models/star-lift-worker.model';
import { answerStarLiftRequest } from '../utils/star-lift-message.util';

/**
 * Star-lift Web Worker: dispatch only. Every incoming message goes to the pure
 * `answerStarLiftRequest`, and whatever it returns is posted back with its buffers
 * transferred, never copied. All logic lives in the utils so it can be tested without a worker.
 */

// Justification for the cast: the app tsconfig compiles with the DOM lib (no `webworker` lib),
// so the dedicated-worker global scope is typed as `Window`. This minimal cast types exactly
// the two members the worker uses, with the worker-scope `postMessage` signature.
const workerScope = self as unknown as {
  postMessage(message: StarLiftResponse, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
};

workerScope.addEventListener('message', (event: MessageEvent) => {
  const answer = answerStarLiftRequest(event.data);
  if (answer !== null) {
    workerScope.postMessage(answer.response, answer.transfer);
  }
});
