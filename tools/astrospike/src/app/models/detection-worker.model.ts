import { InjectionToken } from '@angular/core';
import { DetectedStar } from './detected-star.model';

/**
 * Message posted to the detection Web Worker to start a star detection run.
 * `pixels` is the transferred RGBA buffer of the full-resolution image.
 */
export interface DetectionRequest {
  /** Discriminator for the worker message protocol. */
  type: 'detect';
  /** Monotonic id used to discard responses from superseded runs. */
  generationId: number;
  /** Full-resolution image width in pixels. */
  width: number;
  /** Full-resolution image height in pixels. */
  height: number;
  /** Transferable RGBA pixel buffer (4 bytes per pixel, row-major). */
  pixels: ArrayBuffer;
}

/**
 * Successful detection response carrying the detected stars.
 */
export interface DetectionResultResponse {
  /** Discriminator for the worker message protocol. */
  type: 'result';
  /** Echoes the request's generation id. */
  generationId: number;
  /** Detected stars sorted flux-descending, ids assigned by sort index. */
  stars: DetectedStar[];
}

/**
 * Failure detection response carrying a diagnostic message.
 */
export interface DetectionErrorResponse {
  /** Discriminator for the worker message protocol. */
  type: 'error';
  /** Echoes the request's generation id. */
  generationId: number;
  /** Human-readable description of what went wrong. */
  message: string;
}

/**
 * Message posted back by the detection Web Worker: either the detected
 * stars or an error description.
 */
export type DetectionResponse = DetectionResultResponse | DetectionErrorResponse;

/**
 * Factory producing the detection Web Worker, or `null` when workers are
 * unavailable (e.g. during server-side rendering or in restricted specs).
 */
export type DetectionWorkerFactory = () => Worker | null;

/**
 * Injection token for the {@link DetectionWorkerFactory}. Lives in this
 * model file (not a service) so specs can override the worker with a mock.
 */
export const DETECTION_WORKER_FACTORY_TOKEN = new InjectionToken<DetectionWorkerFactory>(
  'DETECTION_WORKER_FACTORY_TOKEN',
);

/**
 * Pixel data retained on the main thread so an unproven worker that errors on
 * its very first message can be replaced by a synchronous fallback run.
 */
export interface DetectionFallbackInput {
  /** Copy of the full-resolution RGBA pixels. */
  pixels: Uint8ClampedArray;
  /** Full-resolution image width in pixels. */
  width: number;
  /** Full-resolution image height in pixels. */
  height: number;
}

/**
 * Book-keeping for one in-flight detection run owned by the detection
 * service: the promise callbacks, the run's generation id (stale responses
 * are dropped), and the optional main-thread fallback input.
 */
export interface PendingDetection {
  /** Generation id of this run; responses with another id are ignored. */
  generationId: number;
  /** Resolves the caller's promise with the detected stars. */
  resolve: (stars: DetectedStar[]) => void;
  /** Rejects the caller's promise with a typed detection error. */
  reject: (error: Error) => void;
  /** Fallback pixels, kept only until the worker has proven itself. */
  fallback: DetectionFallbackInput | null;
}
