import { TestBed } from '@angular/core/testing';
import {
  DETECTION_WORKER_FACTORY_TOKEN,
  DetectionRequest,
} from '../models/detection-worker.model';
import { SupersededError } from '../models/detection.error';
import { SyntheticStar } from '../models/synthetic-field.model';
import { renderSyntheticField } from '../utils/star-field-fixture.util';
import { StarDetectionService } from './star-detection.service';

const FIXTURE_WIDTH = 160;
const FIXTURE_HEIGHT = 120;

/** Bright, well-separated stars the default DETECTION_OPTIONS must find. */
const FIXTURE_STARS: readonly SyntheticStar[] = [
  { x: 40.2, y: 30.6, amplitude: 220, sigma: 2.0 },
  { x: 110.5, y: 80.3, amplitude: 160, sigma: 1.8 },
  { x: 70.8, y: 100.4, amplitude: 120, sigma: 1.6 },
];

/** Builds a deterministic synthetic-star-field ImageData for detection. */
function buildFixtureImageData(): ImageData {
  const rgba = renderSyntheticField(
    FIXTURE_WIDTH,
    FIXTURE_HEIGHT,
    FIXTURE_STARS,
    { base: 15, gradientX: 0, gradientY: 0 },
    2,
    777,
  );
  // Copy into a fresh buffer: the fixture's Uint8ClampedArray is typed over
  // ArrayBufferLike, while the ImageData constructor requires ArrayBuffer.
  return new ImageData(new Uint8ClampedArray(rgba), FIXTURE_WIDTH, FIXTURE_HEIGHT);
}

/**
 * Minimal scripted stand-in for the detection worker: records posted
 * requests and lets the spec fire onmessage/onerror by hand.
 */
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: DetectionRequest[] = [];
  terminated = false;

  postMessage(message: DetectionRequest): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }
}

describe('StarDetectionService', () => {
  describe('with no worker available (null factory)', () => {
    let service: StarDetectionService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [{ provide: DETECTION_WORKER_FACTORY_TOKEN, useValue: () => null }],
      });
      service = TestBed.inject(StarDetectionService);
    });

    it('should detect stars on the main thread when the factory returns null', async () => {
      const stars = await service.detect(buildFixtureImageData());

      expect(stars.length).toBe(FIXTURE_STARS.length);
      for (const injected of FIXTURE_STARS) {
        const distances = stars.map((s) => Math.hypot(s.x - injected.x, s.y - injected.y));
        expect(Math.min(...distances))
          .withContext(`star at (${injected.x}, ${injected.y})`)
          .toBeLessThanOrEqual(1.5);
      }
    });
  });

  describe('with a scripted fake worker', () => {
    let service: StarDetectionService;
    let created: FakeWorker[];

    beforeEach(() => {
      created = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: DETECTION_WORKER_FACTORY_TOKEN,
            useValue: () => {
              const worker = new FakeWorker();
              created.push(worker);
              // Justification for the cast: FakeWorker implements exactly the
              // Worker surface the service uses (postMessage/terminate and the
              // onmessage/onerror fields).
              return worker as unknown as Worker;
            },
          },
        ],
      });
      service = TestBed.inject(StarDetectionService);
    });

    it('should supersede an in-flight detection when a new one starts', async () => {
      const first = service.detect(buildFixtureImageData());
      const second = service.detect(buildFixtureImageData());

      await expectAsync(first).toBeRejectedWithError(SupersededError);
      expect(created.length).toBe(2);
      expect(created[0].terminated).toBeTrue();

      const secondWorker = created[1];
      const request = secondWorker.posted[0];
      expect(request.type).toBe('detect');
      secondWorker.onmessage?.(
        new MessageEvent('message', {
          data: { type: 'result', generationId: request.generationId, stars: [] },
        }),
      );
      await expectAsync(second).toBeResolvedTo([]);
    });

    it('should drop responses from a stale generation', async () => {
      const promise = service.detect(buildFixtureImageData());
      const worker = created[0];
      const request = worker.posted[0];

      let settled = false;
      void promise.then(() => (settled = true));

      worker.onmessage?.(
        new MessageEvent('message', {
          data: { type: 'result', generationId: request.generationId - 1, stars: [] },
        }),
      );
      await Promise.resolve();
      expect(settled).withContext('stale response must not settle the run').toBeFalse();

      worker.onmessage?.(
        new MessageEvent('message', {
          data: { type: 'result', generationId: request.generationId, stars: [] },
        }),
      );
      await expectAsync(promise).toBeResolvedTo([]);
    });

    it('should fall back to main-thread detection when an unproven worker errors', async () => {
      const promise = service.detect(buildFixtureImageData());
      const worker = created[0];

      worker.onerror?.(new ErrorEvent('error'));

      const stars = await promise;
      expect(worker.terminated).toBeTrue();
      expect(stars.length).toBe(FIXTURE_STARS.length);
    });
  });
});
