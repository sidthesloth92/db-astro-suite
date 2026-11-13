import { TestBed } from '@angular/core/testing';
import { makePhoto } from '../../testing/synthetic-photo.util';
import { PATCH_STRIDE } from '../constants/star-lift.constant';
import { LiftedScene } from '../models/lifted-scene.model';
import { StarLiftError, StarLiftSupersededError } from '../models/star-lift.error';
import {
  STAR_LIFT_WORKER_FACTORY_TOKEN,
  StarLiftRequest,
  StarLiftResponse,
} from '../models/star-lift-worker.model';
import { StarLiftService } from './star-lift.service';

const W = 120;
const H = 100;

/** A photo with one star, as the ImageData the service takes. */
function photo(): ImageData {
  const pixels = makePhoto(W, H, [0.05, 0.05, 0.05], [{ x: 60, y: 50, amp: 0.6, sigma: 2 }]);
  return new ImageData(new Uint8ClampedArray(pixels), W, H);
}

/** Stand-in for the Web Worker that records requests and lets the spec answer them. */
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  readonly requests: StarLiftRequest[] = [];
  terminated = false;

  postMessage(request: StarLiftRequest): void {
    this.requests.push(request);
  }
  terminate(): void {
    this.terminated = true;
  }
  /** Answers the latest request the way the real worker would. */
  respond(response: StarLiftResponse): void {
    // Justification for the cast: only `data` is read by the service.
    this.onmessage?.({ data: response } as MessageEvent);
  }
}

/** A minimal scene, enough to tell responses apart. */
const sceneOf = (width: number): LiftedScene => ({
  width,
  height: 1,
  photo: new Uint8ClampedArray(4),
  starless: new Uint8ClampedArray(4),
  cloudDepth: new Uint8Array(1),
  atlas: new Uint8ClampedArray(4),
  atlasWidth: 1,
  atlasHeight: 1,
  patches: new Float32Array(0),
  stars: new Float32Array(0),
  giants: new Float32Array(0),
});

describe('StarLiftService', () => {
  let workers: FakeWorker[];

  function configure(factory: () => Worker | null): StarLiftService {
    TestBed.configureTestingModule({
      providers: [{ provide: STAR_LIFT_WORKER_FACTORY_TOKEN, useValue: factory }],
    });
    return TestBed.inject(StarLiftService);
  }

  /** Factory handing out fake workers, typed as real ones for the service. */
  const fakeFactory = (): Worker => {
    const worker = new FakeWorker();
    workers.push(worker);
    // Justification for the cast: the service only uses the members FakeWorker implements.
    return worker as unknown as Worker;
  };

  beforeEach(() => {
    workers = [];
  });

  it('should hand the photo to the worker and resolve with the scene it returns', async () => {
    const service = configure(fakeFactory);
    const result = service.lift(photo());

    expect(workers.length).toBe(1);
    const request = workers[0].requests[0];
    expect(request.type).toBe('lift');
    expect(request.width).toBe(W);
    expect(request.pixels.byteLength).toBe(W * H * 4);

    workers[0].respond({ type: 'result', generationId: request.generationId, scene: sceneOf(7) });
    expect((await result).width).toBe(7);
  });

  it('should reject with a typed error when the worker reports a failure', async () => {
    const service = configure(fakeFactory);
    const result = service.lift(photo());
    const { generationId } = workers[0].requests[0];
    workers[0].respond({ type: 'error', generationId, message: 'boom' });

    await expectAsync(result).toBeRejectedWith(new StarLiftError('boom'));
  });

  it('should drop an older run when a newer photo arrives', async () => {
    const service = configure(fakeFactory);
    const first = service.lift(photo());
    const second = service.lift(photo());

    await expectAsync(first).toBeRejectedWithError(StarLiftSupersededError);
    expect(workers[0].terminated).toBeTrue();
    const { generationId } = workers[1].requests[0];
    workers[1].respond({ type: 'result', generationId, scene: sceneOf(3) });
    expect((await second).width).toBe(3);
  });

  it('should ignore a late answer that belongs to an older run', async () => {
    const service = configure(fakeFactory);
    const result = service.lift(photo());
    const { generationId } = workers[0].requests[0];
    workers[0].respond({ type: 'result', generationId: generationId - 1, scene: sceneOf(99) });
    workers[0].respond({ type: 'result', generationId, scene: sceneOf(5) });
    expect((await result).width).toBe(5);
  });

  it('should lift on the main thread when no worker is available', async () => {
    const service = configure(() => null);
    const scene = await service.lift(photo());
    expect(scene.width).toBe(W);
    expect(scene.patches.length).toBe(PATCH_STRIDE);
  });

  it('should fall back to the main thread when the worker fails before its first answer', async () => {
    const service = configure(fakeFactory);
    const result = service.lift(photo());
    workers[0].onerror?.();

    const scene = await result;
    expect(scene.patches.length).toBe(PATCH_STRIDE);
    expect(workers[0].terminated).toBeTrue();
  });

  it('should reject when a proven worker fails later', async () => {
    const service = configure(fakeFactory);
    const first = service.lift(photo());
    workers[0].respond({ type: 'result', generationId: workers[0].requests[0].generationId, scene: sceneOf(1) });
    await first;

    const second = service.lift(photo());
    workers[0].onerror?.();
    await expectAsync(second).toBeRejectedWithError(StarLiftError);
  });

  it('should stop the worker and drop the run in flight when cancelled', async () => {
    const service = configure(fakeFactory);
    const result = service.lift(photo());
    service.cancel();

    await expectAsync(result).toBeRejectedWithError(StarLiftSupersededError);
    expect(workers[0].terminated).toBeTrue();
  });

  it('should do nothing when cancelled with no run in flight', () => {
    const service = configure(fakeFactory);
    expect(() => service.cancel()).not.toThrow();
    expect(workers.length).toBe(0);
  });

  it('should stop the worker and reject the run in flight when destroyed', async () => {
    const service = configure(fakeFactory);
    const result = service.lift(photo());
    service.ngOnDestroy();

    await expectAsync(result).toBeRejectedWithError(StarLiftSupersededError);
    expect(workers[0].terminated).toBeTrue();
  });
});
