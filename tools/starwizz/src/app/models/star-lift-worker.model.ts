import { InjectionToken } from '@angular/core';
import { LiftedScene } from './lifted-scene.model';

/** Message posted to the star-lift Web Worker to analyse one photo. */
export interface StarLiftRequest {
  /** Discriminator for the worker message protocol. */
  type: 'lift';
  /** Monotonic id used to discard responses from superseded runs. */
  generationId: number;
  /** Working-image width in px. */
  width: number;
  /** Working-image height in px. */
  height: number;
  /** Transferable RGBA pixel buffer (4 bytes per pixel, row-major). */
  pixels: ArrayBuffer;
}

/** Successful response carrying the lifted scene. */
export interface StarLiftResultResponse {
  /** Discriminator for the worker message protocol. */
  type: 'result';
  /** Echoes the request's generation id. */
  generationId: number;
  /** The lifted scene; its buffers are transferred back. */
  scene: LiftedScene;
}

/** Failure response carrying a diagnostic message. */
export interface StarLiftErrorResponse {
  /** Discriminator for the worker message protocol. */
  type: 'error';
  /** Echoes the request's generation id. */
  generationId: number;
  /** Human-readable description of what went wrong. */
  message: string;
}

/** Message posted back by the star-lift Web Worker. */
export type StarLiftResponse = StarLiftResultResponse | StarLiftErrorResponse;

/** What the worker posts back for one request: the response and the buffers to transfer with it. */
export interface StarLiftAnswer {
  /** The message to post. */
  response: StarLiftResponse;
  /** Buffers handed over to the receiver instead of being copied. */
  transfer: Transferable[];
}

/** Factory producing the star-lift Web Worker, or `null` when workers are unavailable. */
export type StarLiftWorkerFactory = () => Worker | null;

/**
 * Injection token for the {@link StarLiftWorkerFactory}. Lives in this model file (not a
 * service) so specs can replace the worker with a fake.
 */
export const STAR_LIFT_WORKER_FACTORY_TOKEN = new InjectionToken<StarLiftWorkerFactory>(
  'STAR_LIFT_WORKER_FACTORY_TOKEN',
);

/** Pixels retained on the main thread so a worker that fails on its first message can be replaced. */
export interface StarLiftFallbackInput {
  /** Copy of the working-image RGBA pixels. */
  pixels: Uint8ClampedArray;
  /** Working-image width in px. */
  width: number;
  /** Working-image height in px. */
  height: number;
}

/** Book-keeping for the one in-flight star-lifting run. */
export interface PendingStarLift {
  /** Generation id of this run; responses with another id are ignored. */
  generationId: number;
  /** Resolves the caller's promise with the lifted scene. */
  resolve: (scene: LiftedScene) => void;
  /** Rejects the caller's promise with a typed error. */
  reject: (error: Error) => void;
  /** Fallback pixels, kept only until the worker has proven itself. */
  fallback: StarLiftFallbackInput | null;
}
