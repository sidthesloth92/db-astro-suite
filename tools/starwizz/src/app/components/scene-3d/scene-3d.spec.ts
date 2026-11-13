import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { makePhoto } from '../../../testing/synthetic-photo.util';
import {
  AIM_KEY_STEP,
  AIM_KEY_STEP_LARGE,
  SCENE3D_ERROR_UNSUPPORTED,
} from '../../constants/scene3d.constant';
import { ParallaxRenderer } from '../../models/parallax-renderer.model';
import { Vec3 } from '../../models/scene-pose.model';
import { Scene3dService } from '../../services/scene3d.service';
import { SimulationService } from '../../services/simulation.service';
import { StarLiftService } from '../../services/star-lift.service';
import { liftStars } from '../../utils/star-lift.util';
import { Scene3d } from './scene-3d';

const W = 180;
const H = 320;

/** Loads a small solid image, standing in for the user's photo. */
function loadImage(): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = canvas.toDataURL('image/png');
  });
}

describe('Scene3d', () => {
  let fixture: ComponentFixture<Scene3d>;
  let simService: SimulationService;
  let scene3d: Scene3dService;
  let host: HTMLElement;

  beforeEach(async () => {
    const scene = liftStars(
      makePhoto(W, H, [0.05, 0.05, 0.06], [
        { x: 50, y: 70, amp: 0.6, sigma: 1.8 },
        { x: 130, y: 220, amp: 0.8, sigma: 2 },
      ]),
      W,
      H,
    );
    await TestBed.configureTestingModule({
      imports: [Scene3d],
      providers: [
        { provide: AnalyticsService, useValue: { trackVideoGeneration: () => undefined } },
        {
          provide: StarLiftService,
          useValue: { lift: () => Promise.resolve(scene), cancel: () => undefined },
        },
      ],
    }).compileComponents();
    simService = TestBed.inject(SimulationService);
    scene3d = TestBed.inject(Scene3dService);
  });

  /** Creates the component with a photo loaded and waits for the scene to be ready. */
  async function createWithPhoto(): Promise<void> {
    simService.galaxyImage.set(await loadImage());
    simService.isImageLoaded.set(true);
    fixture = TestBed.createComponent(Scene3d);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    // Lifting resolves on a later tick. (whenStable would never settle: the frame loop keeps
    // the zone busy for as long as the component lives.)
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  function canvas(): HTMLCanvasElement {
    // Justification for the non-null assertion: the template always renders the canvas.
    return host.querySelector('canvas')!;
  }

  /**
   * Takes over the browser's frame clock, so a spec decides when frames happen and how far
   * apart they are. Returns a function that runs every waiting frame `ms` later than the last.
   */
  function controlFrames(): (ms: number) => void {
    let waiting: FrameRequestCallback[] = [];
    let now = 1000;
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
      waiting.push(callback);
      return waiting.length;
    });
    return (ms: number) => {
      now += ms;
      const due = waiting;
      waiting = [];
      for (const callback of due) callback(now);
    };
  }

  /** Watches what the scene draws, and reports where the camera was on the latest frame. */
  function watchCamera(): () => Vec3 {
    const render = spyOn(ParallaxRenderer.prototype, 'render').and.callThrough();
    return () => ({ ...render.calls.mostRecent().args[0].pose.position });
  }

  describe('in a browser without WebGL2', () => {
    const realGetContext = HTMLCanvasElement.prototype.getContext;

    beforeEach(() => {
      spyOn(console, 'error');
      // Only WebGL2 is missing: the 2D canvas the photo is read through still works, as it
      // does in a real browser without WebGL2.
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        contextId: string,
        options?: unknown,
      ): RenderingContext | null {
        return contextId === 'webgl2' ? null : realGetContext.call(this, contextId, options);
        // Justification for the cast: the stand-in forwards every real call unchanged, but one
        // function cannot be typed as all of getContext's overloads at once.
      } as typeof realGetContext;
    });

    afterEach(() => {
      HTMLCanvasElement.prototype.getContext = realGetContext;
    });

    it('should tell the user that 3D cannot be drawn here', async () => {
      await createWithPhoto();
      expect(host.querySelector('[role="alert"]')?.textContent).toContain(SCENE3D_ERROR_UNSUPPORTED);
      expect(scene3d.isReady()).toBeFalse();
    });

    it('should keep saying so after a photo has been lifted', async () => {
      await createWithPhoto();
      // Justification for the non-null assertion: createWithPhoto just loaded this photo.
      await scene3d.prepare(simService.galaxyImage()!);
      fixture.detectChanges();

      expect(host.querySelector('[role="alert"]')?.textContent).toContain(SCENE3D_ERROR_UNSUPPORTED);
      expect(scene3d.isReady()).toBeFalse();
    });
  });

  describe('with WebGL2', () => {
    beforeEach(() => {
      if (!ParallaxRenderer.isSupported()) {
        pending('WebGL2 is not available in this browser');
      }
    });

    it('should lift the stars of the loaded photo and become ready', async () => {
      await createWithPhoto();
      expect(scene3d.status()).toBe('ready');
      expect(host.querySelector('[role="alert"]')).toBeNull();
    });

    it('should size its canvas to the chosen export format', async () => {
      await createWithPhoto();
      expect(canvas().width).toBe(1080);
      expect(canvas().height).toBe(1920);

      simService.currentFormat.set('youtube-1080p');
      fixture.detectChanges();
      expect(canvas().width).toBe(1920);
      expect(canvas().height).toBe(1080);
    });

    it('should drop the scene when the photo is cleared', async () => {
      await createWithPhoto();
      simService.galaxyImage.set(null);
      simService.isImageLoaded.set(false);
      fixture.detectChanges();
      expect(scene3d.status()).toBe('idle');
    });

    it('should record its own canvas when a recording starts, and stop it when it ends', async () => {
      await createWithPhoto();
      const start = spyOn(simService, 'startRecording');
      const stop = spyOn(simService, 'stopRecording');
      const recording = spyOn(simService, 'isRecording').and.returnValue(false);

      simService.recordingState.set('recording');
      fixture.detectChanges();
      expect(start).toHaveBeenCalledOnceWith(canvas());

      recording.and.returnValue(true);
      simService.recordingState.set('idle');
      fixture.detectChanges();
      expect(stop).toHaveBeenCalledTimes(1);
    });

    it('should fly the camera forward through the shot as time passes', async () => {
      const frame = controlFrames();
      const camera = watchCamera();
      await createWithPhoto();
      frame(0);
      const start = camera();
      frame(200);
      frame(200);
      expect(camera().z).toBeLessThan(start.z);
    });

    it('should go back to the first frame for a record-from-beginning request, then record', async () => {
      const frame = controlFrames();
      const camera = watchCamera();
      await createWithPhoto();
      spyOn(simService, 'startRecording');
      frame(0);
      const start = camera();
      for (let i = 0; i < 5; i++) frame(200);
      expect(camera()).not.toEqual(start);

      simService.resetAndRecordRequested.set(true);
      fixture.detectChanges();
      frame(0);

      expect(camera()).toEqual(start);
      expect(simService.resetAndRecordRequested()).toBeFalse();
      expect(simService.recordingState()).toBe('recording');
    });

    it('should go back to the first frame when the user resets the animation', async () => {
      const frame = controlFrames();
      const camera = watchCamera();
      await createWithPhoto();
      frame(0);
      const start = camera();
      for (let i = 0; i < 5; i++) frame(200);
      expect(camera()).not.toEqual(start);

      simService.restartAnimationRequested.set(true);
      fixture.detectChanges();
      frame(0);

      expect(camera()).toEqual(start);
      expect(simService.restartAnimationRequested()).toBeFalse();
    });

    it('should restart the shot when a setting that shapes the stars changes, but not for one that does not apply', async () => {
      const frame = controlFrames();
      const camera = watchCamera();
      await createWithPhoto();
      frame(0);
      const start = camera();
      for (let i = 0; i < 5; i++) frame(200);
      const flown = camera();

      // Zoom In belongs to Arrive: in Travel it must not restart the shot.
      scene3d.zoomIn.set(false);
      fixture.detectChanges();
      frame(0);
      expect(camera()).toEqual(flown);

      scene3d.updateControl('starAmount', 200);
      fixture.detectChanges();
      frame(0);
      expect(camera()).toEqual(start);
    });

    it('should show the aim marker only for a Custom direction', async () => {
      await createWithPhoto();
      expect(host.querySelector('.aim-marker')).toBeNull();

      scene3d.direction.set('custom');
      fixture.detectChanges();
      expect(host.querySelector('.aim-marker')).not.toBeNull();
    });

    it('should move the marker with the pointer and apply the new aim when the drag ends', async () => {
      await createWithPhoto();
      scene3d.direction.set('custom');
      fixture.detectChanges();
      spyOn(canvas(), 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 200, 400));
      spyOn(canvas(), 'setPointerCapture');
      // Justification for the non-null assertion: the marker was just rendered for Custom.
      const marker = host.querySelector<HTMLButtonElement>('.aim-marker')!;

      canvas().dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 150, clientY: 100 }));
      canvas().dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 50, clientY: 300 }));
      fixture.detectChanges();

      // The marker follows the pointer, but the shot is not restarted on every move.
      expect(marker.style.left).toBe('25%');
      expect(marker.style.top).toBe('75%');
      expect(scene3d.aim()).toEqual({ x: 0, y: 0 });

      canvas().dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      expect(scene3d.aim()).toEqual({ x: -0.25, y: 0.25 });

      canvas().dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 100, clientY: 200 }));
      canvas().dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      expect(scene3d.aim()).toEqual({ x: -0.25, y: 0.25 });
    });

    it('should apply the aim when the browser takes the pointer away mid-drag', async () => {
      await createWithPhoto();
      scene3d.direction.set('custom');
      fixture.detectChanges();
      spyOn(canvas(), 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 200, 400));
      spyOn(canvas(), 'setPointerCapture');

      canvas().dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 150, clientY: 100 }));
      canvas().dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 }));
      expect(scene3d.aim()).toEqual({ x: 0.25, y: -0.25 });
    });

    it('should let keyboard users nudge the aim point with the arrow keys', async () => {
      await createWithPhoto();
      scene3d.direction.set('custom');
      fixture.detectChanges();
      // Justification for the non-null assertion: the marker was just rendered for Custom.
      const marker = host.querySelector<HTMLButtonElement>('.aim-marker')!;

      marker.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      marker.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(scene3d.aim().x).toBeCloseTo(AIM_KEY_STEP, 6);
      expect(scene3d.aim().y).toBeCloseTo(-AIM_KEY_STEP, 6);

      marker.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }));
      expect(scene3d.aim().x).toBeCloseTo(AIM_KEY_STEP - AIM_KEY_STEP_LARGE, 6);
    });

    it('should tell screen reader users where the aim point is', async () => {
      await createWithPhoto();
      scene3d.direction.set('custom');
      scene3d.setAim({ x: 0.25, y: -0.1 });
      fixture.detectChanges();

      const label = host.querySelector('.aim-marker')?.getAttribute('aria-label');
      expect(label).toContain('25 percent right of centre');
      expect(label).toContain('10 percent above centre');
    });

    it('should ignore drags on the preview when the direction is not Custom', async () => {
      await createWithPhoto();
      canvas().dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 150, clientY: 100 }));
      expect(scene3d.aim()).toEqual({ x: 0, y: 0 });
    });
  });
});
