import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { DetectedStar } from '../../models/detected-star.model';
import { ImageLoadService } from '../../services/image-load.service';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { SpikeExportService } from '../../services/spike-export.service';
import { StarDetectionService } from '../../services/star-detection.service';
import { SpikeStage } from './spike-stage';

const IMAGE_WIDTH = 400;
const IMAGE_HEIGHT = 200;

/** Builds a detected star at the given full-resolution image position. */
function makeStar(id: number, x: number, y: number): DetectedStar {
  return {
    id,
    x,
    y,
    flux: 100 - id,
    peak: 1,
    area: 5,
    elongation: 1,
    color: { r: 255, g: 255, b: 255 },
  };
}

describe('SpikeStage', () => {
  let fixture: ComponentFixture<SpikeStage>;
  let editor: SpikeEditorService;
  let loadSpy: jasmine.Spy;

  /** The topmost overlay canvas, which receives every stage pointer event. */
  function markerCanvas(): HTMLCanvasElement {
    const canvas: HTMLCanvasElement | null =
      fixture.nativeElement.querySelector('canvas.marker-canvas');
    if (canvas === null) {
      throw new Error('marker canvas not rendered');
    }
    return canvas;
  }

  /** Client coordinates of a full-resolution image point on the marker canvas. */
  function clientPointFor(imageX: number, imageY: number): { clientX: number; clientY: number } {
    const canvas = markerCanvas();
    const rect = canvas.getBoundingClientRect();
    return {
      clientX: Math.round(rect.left + (imageX * rect.width) / canvas.width),
      clientY: Math.round(rect.top + (imageY * rect.height) / canvas.height),
    };
  }

  /** Puts a decoded stub image into the editor, as a successful load would. */
  async function loadStubImage(): Promise<void> {
    const source = document.createElement('canvas');
    source.width = IMAGE_WIDTH;
    source.height = IMAGE_HEIGHT;
    const bitmap = await createImageBitmap(source);
    editor.imageMeta.set({ fileName: 'm31.png', width: IMAGE_WIDTH, height: IMAGE_HEIGHT });
    editor.sourceImage.set(bitmap);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SpikeStage],
      providers: [
        {
          provide: ImageLoadService,
          useValue: jasmine.createSpyObj<ImageLoadService>('ImageLoadService', ['loadImageFile']),
        },
        {
          provide: StarDetectionService,
          useValue: jasmine.createSpyObj<StarDetectionService>('StarDetectionService', ['detect']),
        },
        {
          provide: SpikeExportService,
          useValue: jasmine.createSpyObj<SpikeExportService>('SpikeExportService', ['exportImage']),
        },
        {
          provide: AnalyticsService,
          useValue: jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['trackEvent']),
        },
      ],
    });
    await TestBed.compileComponents();
    editor = TestBed.inject(SpikeEditorService);
    loadSpy = spyOn(editor, 'loadImage').and.resolveTo();
    fixture = TestBed.createComponent(SpikeStage);
    // The stage sizes its canvases against its own box, so give the host a
    // definite size for the pointer-coordinate maths.
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = `${IMAGE_WIDTH}px`;
    host.style.height = `${IMAGE_HEIGHT}px`;
    fixture.detectChanges();
  });

  it('should create with the preview canvas in place', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('canvas.after-canvas')).toBeTruthy();
  });

  it('should show the dropzone when no image is loaded', () => {
    expect(fixture.nativeElement.querySelector('dba-as-image-dropzone')).toBeTruthy();
  });

  it('should show the loader with a status line while detecting stars', () => {
    editor.isDetecting.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('dba-as-image-dropzone')).toBeNull();
    const overlay: HTMLElement | null = fixture.nativeElement.querySelector('[role="status"]');
    expect(overlay?.textContent).toContain('Detecting stars…');
  });

  it('should show the error banner instead of the dropzone on an image error', () => {
    editor.imageError.set('The image could not be loaded. Please try a different file.');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('dba-as-image-dropzone')).toBeNull();
    const alert: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('The image could not be loaded.');
  });

  it('should clear the editor when Try another image is clicked', () => {
    const clearSpy = spyOn(editor, 'clearImage');
    editor.imageError.set('boom');
    fixture.detectChanges();

    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[role="alert"] button');
    expect(button).toBeTruthy();
    button?.click();

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('should load a file dropped anywhere on the stage', () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['x'], 'm31.png', { type: 'image/png' }));
    const stage: HTMLElement | null = fixture.nativeElement.querySelector('.stage');
    if (stage === null) {
      throw new Error('stage element not rendered');
    }

    stage.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }),
    );

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect((loadSpy.calls.mostRecent().args[0] as File).name).toBe('m31.png');
  });

  it('should forward a file picked in the dropzone to the editor', () => {
    const dropzone = fixture.nativeElement.querySelector('dba-as-image-dropzone .dropzone');
    if (dropzone === null) {
      throw new Error('dropzone not rendered');
    }
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['x'], 'orion.png', { type: 'image/png' }));

    dropzone.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }),
    );

    // The dropzone stops propagation, so the stage handler must not double-load.
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect((loadSpy.calls.mostRecent().args[0] as File).name).toBe('orion.png');
  });

  describe('before/after comparison', () => {
    it('should keep the original hidden until the divider is moved', async () => {
      await loadStubImage();

      const after: HTMLElement | null =
        fixture.nativeElement.querySelector('canvas.after-canvas');
      expect(after?.style.clipPath).toContain('0%');
      expect(after?.style.clipPath).not.toContain('40%');
    });

    it('should wipe the after canvas open as the compare position changes', async () => {
      await loadStubImage();

      editor.comparePosition.set(0.4);
      fixture.detectChanges();

      const after: HTMLElement | null =
        fixture.nativeElement.querySelector('canvas.after-canvas');
      expect(after?.style.clipPath).toContain('40%');
    });

    it('should give every canvas the same backing store so they stay aligned', async () => {
      await loadStubImage();

      const canvases: HTMLCanvasElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('canvas'),
      );
      expect(canvases.length).toBe(3);
      for (const canvas of canvases) {
        expect(canvas.width).toBe(IMAGE_WIDTH);
        expect(canvas.height).toBe(IMAGE_HEIGHT);
      }
    });

    it('should show the compare divider only once an image is ready', async () => {
      expect(fixture.nativeElement.querySelector('dba-as-compare-handle')).toBeNull();

      await loadStubImage();

      expect(fixture.nativeElement.querySelector('dba-as-compare-handle')).toBeTruthy();
    });

    it('should hide the compare divider while stars are being detected', async () => {
      await loadStubImage();
      editor.isDetecting.set(true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('dba-as-compare-handle')).toBeNull();
    });

    it('should store the position the divider reports', async () => {
      await loadStubImage();

      const divider: HTMLElement | null = fixture.nativeElement.querySelector('[role="slider"]');
      divider?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'End' }),
      );

      expect(editor.comparePosition()).toBe(1);
    });

    it('should not repaint the spikes while the compare divider moves', async () => {
      const pending: FrameRequestCallback[] = [];
      spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
        pending.push(callback);
        return pending.length;
      });
      const flush = (): void => {
        for (const callback of pending.splice(0)) {
          callback(0);
        }
      };

      await loadStubImage();
      flush();

      // Count actual repaints of the spiked canvas rather than every window
      // animation frame — unrelated frames (Angular's scheduler, UI library
      // components) would otherwise be miscounted as spike re-renders.
      const afterCanvas: HTMLCanvasElement =
        fixture.nativeElement.querySelector('canvas.after-canvas');
      const afterCtx = afterCanvas.getContext('2d');
      if (afterCtx === null) {
        throw new Error('spec canvas has no 2d context');
      }
      const drawSpy = spyOn(afterCtx, 'drawImage').and.callThrough();

      const afterElement: HTMLElement = afterCanvas;
      const clipBefore = afterElement.style.clipPath;

      editor.comparePosition.set(0.6);
      fixture.detectChanges();
      flush();

      // The move must take effect purely as a clip change...
      expect(afterElement.style.clipPath).not.toBe(clipBefore);
      expect(afterElement.style.clipPath).toContain('60%');
      // ...without repainting a single pixel of the spiked canvas.
      expect(drawSpy).not.toHaveBeenCalled();
    });
  });

  describe('star interaction', () => {
    beforeEach(async () => {
      await loadStubImage();
      editor.allStars.set([makeStar(0, 100, 50), makeStar(1, 300, 150)]);
      fixture.detectChanges();
    });

    it('should mark the star under the pointer as hovered', () => {
      const { clientX, clientY } = clientPointFor(100, 50);

      markerCanvas().dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX, clientY }),
      );

      expect(editor.hoveredStarId()).toBe(0);
    });

    it('should clear the hover when the pointer sits on empty sky', () => {
      editor.hoveredStarId.set(0);
      const { clientX, clientY } = clientPointFor(200, 20);

      markerCanvas().dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX, clientY }),
      );

      expect(editor.hoveredStarId()).toBeNull();
    });

    it('should clear the hover when the pointer leaves the preview', () => {
      editor.hoveredStarId.set(1);

      markerCanvas().dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));

      expect(editor.hoveredStarId()).toBeNull();
    });

    it('should draw a marker on the overlay for the hovered star', () => {
      const { clientX, clientY } = clientPointFor(100, 50);

      markerCanvas().dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX, clientY }),
      );
      fixture.detectChanges();

      const canvas = markerCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx === null) {
        throw new Error('2D context unavailable in test');
      }
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      expect(data.some((channel) => channel > 0)).toBe(true);
    });

    it('should leave the overlay empty when nothing is hovered or switched off', () => {
      const canvas = markerCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx === null) {
        throw new Error('2D context unavailable in test');
      }
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      expect(data.some((channel) => channel > 0)).toBe(false);
    });

    it('should leave no badge on a star the user switched off', () => {
      // Switching a star off is its own feedback — the spikes disappear, and
      // clicking again brings them back. A lingering marker just adds noise.
      editor.toggleStar(0);
      fixture.detectChanges();

      const canvas = markerCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx === null) {
        throw new Error('2D context unavailable in test');
      }
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      expect(data.some((channel) => channel > 0)).toBe(false);
    });

    /** Dispatches a press-and-release pair, optionally travelling between. */
    function pressAndRelease(
      downX: number,
      downY: number,
      upX = downX,
      upY = downY,
    ): void {
      const canvas = markerCanvas();
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: downX, clientY: downY }),
      );
      if (upX !== downX || upY !== downY) {
        canvas.dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: upX, clientY: upY }),
        );
      }
      canvas.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: upX, clientY: upY }),
      );
    }

    it('should toggle the star under the pointer when the preview is clicked', () => {
      const toggleSpy = spyOn(editor, 'toggleStar');
      const { clientX, clientY } = clientPointFor(300, 150);

      pressAndRelease(clientX, clientY);

      expect(toggleSpy).toHaveBeenCalledOnceWith(1);
    });

    it('should toggle nothing when the click lands on empty sky', () => {
      const toggleSpy = spyOn(editor, 'toggleStar');
      const { clientX, clientY } = clientPointFor(200, 20);

      pressAndRelease(clientX, clientY);

      expect(toggleSpy).not.toHaveBeenCalled();
    });

    it('should reposition a star when the press on it travels beyond the threshold', () => {
      const toggleSpy = spyOn(editor, 'toggleStar');
      const moveSpy = spyOn(editor, 'moveStar');
      const from = clientPointFor(300, 150);
      const to = clientPointFor(320, 160);
      const canvas = markerCanvas();
      spyOn(canvas, 'setPointerCapture');
      spyOn(canvas, 'hasPointerCapture').and.returnValue(false);

      canvas.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: from.clientX, clientY: from.clientY }),
      );
      canvas.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: to.clientX, clientY: to.clientY }),
      );
      canvas.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: to.clientX, clientY: to.clientY }),
      );

      expect(moveSpy).toHaveBeenCalled();
      const [movedId, movedX, movedY] = moveSpy.calls.mostRecent().args;
      expect(movedId).toBe(1);
      expect(movedX).toBeCloseTo(320, -1);
      expect(movedY).toBeCloseTo(160, -1);
      // A drag never doubles as a toggle.
      expect(toggleSpy).not.toHaveBeenCalled();
    });

    it('should not pan or move anything when dragging empty sky at zoom 1', () => {
      const toggleSpy = spyOn(editor, 'toggleStar');
      const moveSpy = spyOn(editor, 'moveStar');
      const from = clientPointFor(200, 20);
      const to = clientPointFor(260, 60);

      pressAndRelease(from.clientX, from.clientY, to.clientX, to.clientY);

      expect(moveSpy).not.toHaveBeenCalled();
      expect(toggleSpy).not.toHaveBeenCalled();
    });

    it('should still toggle after sub-threshold pointer jitter', () => {
      const toggleSpy = spyOn(editor, 'toggleStar');
      const { clientX, clientY } = clientPointFor(300, 150);

      // 2px of travel is finger shake, not a drag.
      pressAndRelease(clientX, clientY, clientX + 2, clientY + 1);

      expect(toggleSpy).toHaveBeenCalledOnceWith(1);
    });

    it('should find a faint star below the brightness cut so it can be enabled', () => {
      editor.updateControl('stars', 0);
      fixture.detectChanges();
      // Only the brightest star survives the cut — star 1 gets no spikes.
      expect(editor.renderedStars().map((star) => star.id)).toEqual([0]);

      const { clientX, clientY } = clientPointFor(300, 150);
      markerCanvas().dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX, clientY }),
      );

      expect(editor.hoveredStarId()).toBe(1);
    });

    it('should ignore pointer input while star detection is still running', () => {
      editor.isDetecting.set(true);
      fixture.detectChanges();
      const { clientX, clientY } = clientPointFor(100, 50);

      markerCanvas().dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX, clientY }),
      );

      expect(editor.hoveredStarId()).toBeNull();
    });
  });
});
