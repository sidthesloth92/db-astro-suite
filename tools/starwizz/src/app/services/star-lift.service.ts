import { inject, Injectable, OnDestroy } from '@angular/core';
import { LiftedScene } from '../models/lifted-scene.model';
import { StarLiftError, StarLiftSupersededError } from '../models/star-lift.error';
import {
  PendingStarLift,
  STAR_LIFT_WORKER_FACTORY_TOKEN,
  StarLiftRequest,
  StarLiftResponse,
} from '../models/star-lift-worker.model';
import { createStarLiftWorker } from '../utils/star-lift-worker-factory.util';
import { liftStars } from '../utils/star-lift.util';

/**
 * @class StarLiftService
 * @description
 * Lifts the stars off a photo for the 3D scene, off the main thread via a module Web Worker,
 * with a transparent main-thread fallback when Workers are unavailable or the worker dies
 * before proving itself.
 *
 * @responsibilities
 * - Own the worker lifecycle (lazy creation, termination on supersede and destroy)
 * - Give each run a generation id and drop stale responses
 * - Reject a superseded run with {@link StarLiftSupersededError} (callers treat it as silent)
 * - Fall back to the main thread when the worker factory returns `null` or the worker errors
 *   on its first message
 */
@Injectable({ providedIn: 'root' })
export class StarLiftService implements OnDestroy {
  /** Worker factory, replaceable in specs through the injection token. */
  private readonly workerFactory =
    inject(STAR_LIFT_WORKER_FACTORY_TOKEN, { optional: true }) ?? createStarLiftWorker;

  /** Lazily created worker, or null when unavailable or terminated. */
  private worker: Worker | null = null;

  /** True once the worker has produced any response; until then a fallback copy is kept. */
  private workerProven = false;

  /** Monotonic id source; each lift() call claims the next id. */
  private generationId = 0;

  /** The single in-flight run, or null when idle. */
  private pending: PendingStarLift | null = null;

  /**
   * Lifts the stars off a working-size photo. A run already in flight is superseded: its worker
   * is terminated and its promise rejects with {@link StarLiftSupersededError}. The pixel buffer
   * is transferred to the worker, so `imageData` must not be reused by the caller.
   *
   * @param imageData - Working-size RGBA pixels of the photo
   * @returns The lifted scene
   */
  lift(imageData: ImageData): Promise<LiftedScene> {
    this.supersedePending();
    const generationId = ++this.generationId;

    const worker = this.ensureWorker();
    if (worker === null) {
      return this.liftOnMainThread(imageData.data, imageData.width, imageData.height);
    }

    return new Promise<LiftedScene>((resolve, reject) => {
      const fallback = this.workerProven
        ? null
        : {
            pixels: new Uint8ClampedArray(imageData.data),
            width: imageData.width,
            height: imageData.height,
          };
      this.pending = { generationId, resolve, reject, fallback };

      // Justification for the cast: `ImageData` is always backed by a plain, non-shared
      // ArrayBuffer, but the typed-array generics surface it as ArrayBufferLike.
      const buffer = imageData.data.buffer as ArrayBuffer;
      const request: StarLiftRequest = {
        type: 'lift',
        generationId,
        width: imageData.width,
        height: imageData.height,
        pixels: buffer,
      };
      worker.postMessage(request, [buffer]);
    });
  }

  /**
   * Abandons the run in flight, if any: its worker is stopped and its promise rejects with
   * {@link StarLiftSupersededError}. For when the photo is cleared mid-lift.
   */
  cancel(): void {
    this.supersedePending();
  }

  /** Terminates the worker and rejects any in-flight run on teardown. */
  ngOnDestroy(): void {
    this.supersedePending();
    if (this.worker !== null) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /** Rejects the in-flight run (if any) and terminates its worker so stale work never burns CPU. */
  private supersedePending(): void {
    if (this.pending === null) {
      return;
    }
    const pending = this.pending;
    this.pending = null;
    if (this.worker !== null) {
      this.worker.terminate();
      this.worker = null;
    }
    pending.reject(new StarLiftSupersededError());
  }

  /** Returns the live worker, creating and wiring one if needed. */
  private ensureWorker(): Worker | null {
    if (this.worker !== null) {
      return this.worker;
    }
    const worker = this.workerFactory();
    if (worker === null) {
      return null;
    }
    worker.onmessage = (event: MessageEvent) => this.handleWorkerMessage(event);
    worker.onerror = () => this.handleWorkerError();
    this.worker = worker;
    return worker;
  }

  /** Routes a worker response to the in-flight run; stale responses are dropped. */
  private handleWorkerMessage(event: MessageEvent): void {
    // Justification for the cast: `MessageEvent#data` is untyped; the worker only ever posts
    // the StarLiftResponse protocol shape.
    const response = event.data as StarLiftResponse;
    const pending = this.pending;
    if (pending === null || response.generationId !== pending.generationId) {
      return;
    }
    this.pending = null;
    this.workerProven = true;
    if (response.type === 'result') {
      pending.resolve(response.scene);
    } else {
      pending.reject(new StarLiftError(response.message));
    }
  }

  /**
   * Handles a worker `error` event. A worker that failed before its first response (its chunk
   * did not load, say) is replaced by a main-thread run over the retained pixel copy; a proven
   * worker's failure rejects the run with a typed error.
   */
  private handleWorkerError(): void {
    const pending = this.pending;
    this.pending = null;
    if (this.worker !== null) {
      this.worker.terminate();
      this.worker = null;
    }
    if (pending === null) {
      return;
    }
    if (pending.fallback !== null) {
      const { pixels, width, height } = pending.fallback;
      this.liftOnMainThread(pixels, width, height).then(pending.resolve, pending.reject);
      return;
    }
    pending.reject(new StarLiftError('The star-lift worker failed.'));
  }

  /** Runs the pipeline on the main thread; resolves and rejects exactly like the worker path. */
  private liftOnMainThread(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): Promise<LiftedScene> {
    try {
      return Promise.resolve(liftStars(pixels, width, height));
    } catch (error) {
      return Promise.reject(
        new StarLiftError(error instanceof Error ? error.message : String(error)),
      );
    }
  }
}
