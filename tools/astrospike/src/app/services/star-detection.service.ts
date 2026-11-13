import { inject, Injectable, OnDestroy } from '@angular/core';
import { DETECTION_OPTIONS } from '../constants/detection.constants';
import { DetectedStar } from '../models/detected-star.model';
import {
  DETECTION_WORKER_FACTORY_TOKEN,
  DetectionRequest,
  DetectionResponse,
  PendingDetection,
} from '../models/detection-worker.model';
import { StarDetectionError, SupersededError } from '../models/detection.error';
import { createDetectionWorker } from '../utils/detection-worker-factory.util';
import { detectStars } from '../utils/star-detection.util';

/**
 * @class StarDetectionService
 * @description
 * Runs the star detection pipeline off the main thread via a module Web
 * Worker, with a transparent main-thread fallback when Workers are
 * unavailable or the worker dies before proving itself.
 *
 * @responsibilities
 * - Own the worker lifecycle (lazy creation, termination on supersede/destroy)
 * - Assign a monotonic generation id per run and drop stale responses
 * - Reject a superseded run with {@link SupersededError} (callers treat it as
 *   silent) when a newer detection starts while one is in flight
 * - Fall back to synchronous main-thread detection when the worker factory
 *   returns `null` or the worker errors on its first message
 */
@Injectable({ providedIn: 'root' })
export class StarDetectionService implements OnDestroy {
  /** Worker factory — spec-overridable via the injection token. */
  private readonly workerFactory =
    inject(DETECTION_WORKER_FACTORY_TOKEN, { optional: true }) ?? createDetectionWorker;

  /** Lazily created detection worker, or null when unavailable/terminated. */
  private worker: Worker | null = null;

  /**
   * True once the worker module has produced any response this session.
   * Until then every request retains a pixel copy so a worker that fails on
   * its very first message can be replaced by a main-thread fallback run.
   */
  private workerProven = false;

  /** Monotonic id source; each detect() call claims the next id. */
  private generationId = 0;

  /** The single in-flight run, or null when idle. */
  private pending: PendingDetection | null = null;

  /**
   * Detects stars in a full-resolution image. If a detection is already in
   * flight it is superseded: its worker is terminated and its promise rejects
   * with {@link SupersededError}. The pixel buffer is transferred to the
   * worker, so `imageData` must not be reused by the caller afterwards.
   *
   * @param imageData Full-resolution RGBA image data.
   * @returns Detected stars sorted by flux descending.
   */
  detect(imageData: ImageData): Promise<DetectedStar[]> {
    this.supersedePending();
    const generationId = ++this.generationId;

    const worker = this.ensureWorker();
    if (worker === null) {
      return this.detectOnMainThread(imageData.data, imageData.width, imageData.height);
    }

    return new Promise<DetectedStar[]>((resolve, reject) => {
      const fallback = this.workerProven
        ? null
        : {
            pixels: new Uint8ClampedArray(imageData.data),
            width: imageData.width,
            height: imageData.height,
          };
      this.pending = { generationId, resolve, reject, fallback };

      // Justification for the cast: `ImageData` is always backed by a plain,
      // non-shared ArrayBuffer, but the TS typed-array generics surface it as
      // ArrayBufferLike.
      const buffer = imageData.data.buffer as ArrayBuffer;
      const request: DetectionRequest = {
        type: 'detect',
        generationId,
        width: imageData.width,
        height: imageData.height,
        pixels: buffer,
      };
      worker.postMessage(request, [buffer]);
    });
  }

  /** Terminates the worker and rejects any in-flight run on teardown. */
  ngOnDestroy(): void {
    this.supersedePending();
    if (this.worker !== null) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Rejects the in-flight run (if any) with {@link SupersededError} and
   * terminates its worker so a stale computation never burns CPU.
   */
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
    pending.reject(new SupersededError());
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

  /** Routes a worker response to the in-flight run; stale responses drop. */
  private handleWorkerMessage(event: MessageEvent): void {
    // Justification for the cast: `MessageEvent#data` is untyped; the worker
    // only ever posts the DetectionResponse protocol shape.
    const response = event.data as DetectionResponse;
    const pending = this.pending;
    if (pending === null || response.generationId !== pending.generationId) {
      return; // Stale generation — a newer run owns the worker now.
    }
    this.pending = null;
    this.workerProven = true;
    if (response.type === 'result') {
      pending.resolve(response.stars);
    } else {
      pending.reject(new StarDetectionError(response.message));
    }
  }

  /**
   * Handles a worker `error` event. An unproven worker (failed before its
   * first response, e.g. its chunk did not load) is replaced by a synchronous
   * main-thread run over the retained pixel copy; a proven worker's failure
   * rejects the run with a typed error.
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
      this.detectOnMainThread(pixels, width, height).then(pending.resolve, pending.reject);
      return;
    }
    pending.reject(new StarDetectionError('The star detection worker failed.'));
  }

  /**
   * Runs the detection pipeline synchronously on the main thread — the
   * fallback used when no worker is available. Resolves/rejects identically
   * to the worker path.
   */
  private detectOnMainThread(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): Promise<DetectedStar[]> {
    try {
      return Promise.resolve(detectStars(pixels, width, height, DETECTION_OPTIONS));
    } catch (error) {
      return Promise.reject(
        new StarDetectionError(error instanceof Error ? error.message : String(error)),
      );
    }
  }
}
