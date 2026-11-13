import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { makePhoto } from '../../../testing/synthetic-photo.util';
import { SCENE3D_ERROR_UNSUPPORTED } from '../../constants/scene3d.constant';
import { ParallaxRenderer } from '../../models/parallax-renderer.model';
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
        { provide: StarLiftService, useValue: { lift: () => Promise.resolve(scene) } },
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

  it('should tell the user when the browser cannot draw the 3D scene', async () => {
    spyOn(console, 'error');
    spyOn(HTMLCanvasElement.prototype, 'getContext').and.returnValue(null);
    await createWithPhoto();

    expect(scene3d.status()).toBe('error');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(SCENE3D_ERROR_UNSUPPORTED);
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

    it('should answer a record-from-beginning request and then start recording', async () => {
      await createWithPhoto();
      spyOn(simService, 'startRecording');
      spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });

      simService.resetAndRecordRequested.set(true);
      fixture.detectChanges();

      expect(simService.resetAndRecordRequested()).toBeFalse();
      expect(simService.recordingState()).toBe('recording');
    });

    it('should answer a Reset Animation request', async () => {
      await createWithPhoto();
      simService.restartAnimationRequested.set(true);
      fixture.detectChanges();
      expect(simService.restartAnimationRequested()).toBeFalse();
    });

    it('should show the aim marker only for a Custom direction', async () => {
      await createWithPhoto();
      expect(host.querySelector('.aim-marker')).toBeNull();

      scene3d.direction.set('custom');
      fixture.detectChanges();
      expect(host.querySelector('.aim-marker')).not.toBeNull();
    });

    it('should move the aim point to where the user drags on the preview', async () => {
      await createWithPhoto();
      scene3d.direction.set('custom');
      fixture.detectChanges();
      spyOn(canvas(), 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 200, 400));
      spyOn(canvas(), 'setPointerCapture');

      canvas().dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 150, clientY: 100 }));
      expect(scene3d.aim()).toEqual({ x: 0.25, y: -0.25 });

      canvas().dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 50, clientY: 300 }));
      expect(scene3d.aim()).toEqual({ x: -0.25, y: 0.25 });

      canvas().dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      canvas().dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 100, clientY: 200 }));
      expect(scene3d.aim()).toEqual({ x: -0.25, y: 0.25 });
    });

    it('should let keyboard users nudge the aim point with the arrow keys', async () => {
      await createWithPhoto();
      scene3d.direction.set('custom');
      fixture.detectChanges();
      // Justification for the non-null assertion: the marker was just rendered for Custom.
      const marker = host.querySelector<HTMLButtonElement>('.aim-marker')!;

      marker.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      marker.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

      expect(scene3d.aim().x).toBeGreaterThan(0);
      expect(scene3d.aim().y).toBeLessThan(0);
    });

    it('should ignore drags on the preview when the direction is not Custom', async () => {
      await createWithPhoto();
      canvas().dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 150, clientY: 100 }));
      expect(scene3d.aim()).toEqual({ x: 0, y: 0 });
    });
  });
});
