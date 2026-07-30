import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { DetectedStar } from '../../models/detected-star.model';
import { ImageLoadService } from '../../services/image-load.service';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { SpikeExportService } from '../../services/spike-export.service';
import { StarDetectionService } from '../../services/star-detection.service';
import { STAGE_CLICK_HOLD_MS } from '../../constants/render.constants';
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

  describe('canvas tools', () => {
    beforeEach(async () => {
      await loadStubImage();
      editor.allStars.set([makeStar(0, 100, 50), makeStar(1, 300, 150)]);
      fixture.detectChanges();
    });

    /** Finds a tool-rail button by its title. */
    function tool(title: string): HTMLButtonElement {
      const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
        `.stage-tools button[title="${title}"]`,
      );
      if (button === null) {
        throw new Error(`${title} button not rendered`);
      }
      return button;
    }

    it('should offer zoom, fit, and remove tools on the canvas', () => {
      expect(tool('Zoom in')).toBeTruthy();
      expect(tool('Zoom out')).toBeTruthy();
      expect(tool('Fit to view')).toBeTruthy();
      expect(tool('Remove image')).toBeTruthy();
    });

    it('should disable zoom out until the view is zoomed in', () => {
      expect(tool('Zoom out').disabled).toBeTrue();

      tool('Zoom in').click();
      fixture.detectChanges();

      expect(tool('Zoom out').disabled).toBeFalse();
    });

    it('should return to the fitted view when fit is used', () => {
      tool('Zoom in').click();
      tool('Zoom in').click();
      fixture.detectChanges();
      expect(tool('Zoom out').disabled).toBeFalse();

      tool('Fit to view').click();
      fixture.detectChanges();

      expect(tool('Zoom out').disabled).toBeTrue();
    });

    it('should clear the image from the remove tool', () => {
      const clearSpy = spyOn(editor, 'clearImage');

      tool('Remove image').click();

      expect(clearSpy).toHaveBeenCalledTimes(1);
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

    /** Painted-pixel count of the marker overlay. */
    function markerInk(): number {
      const canvas = markerCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx === null) {
        throw new Error('2D context unavailable in test');
      }
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let painted = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          painted++;
        }
      }
      return painted;
    }

    it('should leave no ring behind on a star that was only clicked', () => {
      const { clientX, clientY } = clientPointFor(300, 150);
      pressAndRelease(clientX, clientY);
      // Move the pointer off every star, so any remaining ink is a marker the
      // click left behind rather than the hover ring.
      markerCanvas().dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 1, clientY: 1 }),
      );
      fixture.detectChanges();

      expect(editor.starControlsId()).toBeNull();
      expect(markerInk()).toBe(0);
    });

    it('should ring the star whose controls a double-click opened', () => {
      const { clientX, clientY } = clientPointFor(300, 150);
      markerCanvas().dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true, clientX, clientY }),
      );
      markerCanvas().dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 1, clientY: 1 }),
      );
      fixture.detectChanges();

      expect(editor.starControlsId()).toBe(1);
      expect(markerInk()).toBeGreaterThan(0);
    });

    it('should drop the ring when the user clicks empty sky', () => {
      const star = clientPointFor(300, 150);
      markerCanvas().dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true, clientX: star.clientX, clientY: star.clientY }),
      );
      expect(editor.starControlsId()).toBe(1);

      const sky = clientPointFor(200, 20);
      pressAndRelease(sky.clientX, sky.clientY);
      fixture.detectChanges();

      expect(editor.starControlsId()).toBeNull();
      expect(markerInk()).toBe(0);
    });


    it('should toggle the star under the pointer when the preview is clicked', fakeAsync(() => {
      const toggleSpy = spyOn(editor, 'toggleStar');
      const { clientX, clientY } = clientPointFor(300, 150);

      pressAndRelease(clientX, clientY);
      // The toggle waits out the double-click window before it lands.
      expect(toggleSpy).not.toHaveBeenCalled();
      tick(STAGE_CLICK_HOLD_MS);

      expect(toggleSpy).toHaveBeenCalledOnceWith(1);
    }));

    it('should not touch the spikes of a spiked star that is double-clicked', fakeAsync(() => {
      // Star 0 is inside the brightness cut, so it already has spikes and
      // opening its controls has no reason to add any.
      expect(editor.renderedStars().map((star) => star.id)).toContain(0);
      const toggleSpy = spyOn(editor, 'toggleStar');
      const { clientX, clientY } = clientPointFor(100, 50);
      const canvas = markerCanvas();

      // Both halves of the gesture, then the dblclick the browser follows with.
      pressAndRelease(clientX, clientY);
      pressAndRelease(clientX, clientY);
      canvas.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX, clientY }));
      tick(STAGE_CLICK_HOLD_MS);

      // Opening the controls must not flash its spikes off and back on.
      expect(toggleSpy).not.toHaveBeenCalled();
      expect(editor.starControlsId()).toBe(0);
    }));

    it('should spike an unspiked star exactly once when it is double-clicked', fakeAsync(() => {
      // Star 1 falls outside the cut, so opening its controls spikes it — once,
      // from the open itself, and not once per click of the gesture.
      expect(editor.renderedStars().map((star) => star.id)).not.toContain(1);
      const toggleSpy = spyOn(editor, 'toggleStar').and.callThrough();
      const { clientX, clientY } = clientPointFor(300, 150);
      const canvas = markerCanvas();

      pressAndRelease(clientX, clientY);
      pressAndRelease(clientX, clientY);
      canvas.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX, clientY }));
      tick(STAGE_CLICK_HOLD_MS);

      expect(toggleSpy).toHaveBeenCalledOnceWith(1);
      expect(editor.renderedStars().map((star) => star.id)).toContain(1);
      expect(editor.starControlsId()).toBe(1);
    }));

    it('should land a held toggle when the next click goes to another star', fakeAsync(() => {
      const toggleSpy = spyOn(editor, 'toggleStar');
      const first = clientPointFor(300, 150);
      const second = clientPointFor(100, 50);

      pressAndRelease(first.clientX, first.clientY);
      // Inside the hold window, so the first toggle is still waiting.
      pressAndRelease(second.clientX, second.clientY);

      // A click on a different star is not a double-click: the first must land.
      expect(toggleSpy).toHaveBeenCalledOnceWith(1);
      tick(STAGE_CLICK_HOLD_MS);
      expect(toggleSpy).toHaveBeenCalledTimes(2);
      expect(toggleSpy.calls.mostRecent().args).toEqual([0]);
    }));

    it('should land a held toggle when the next click goes to empty sky', fakeAsync(() => {
      const toggleSpy = spyOn(editor, 'toggleStar');
      const star = clientPointFor(300, 150);
      const sky = clientPointFor(200, 20);

      pressAndRelease(star.clientX, star.clientY);
      pressAndRelease(sky.clientX, sky.clientY);

      expect(toggleSpy).toHaveBeenCalledOnceWith(1);
      tick(STAGE_CLICK_HOLD_MS);
      expect(toggleSpy).toHaveBeenCalledTimes(1);
    }));

    it('should toggle nothing when the click lands on empty sky', fakeAsync(() => {
      const toggleSpy = spyOn(editor, 'toggleStar');
      const { clientX, clientY } = clientPointFor(200, 20);

      pressAndRelease(clientX, clientY);
      tick(STAGE_CLICK_HOLD_MS);

      expect(toggleSpy).not.toHaveBeenCalled();
    }));

    it('should reposition a star when the press on it travels beyond the threshold', fakeAsync(() => {
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
      // A drag never doubles as a toggle, held or otherwise.
      tick(STAGE_CLICK_HOLD_MS);
      expect(toggleSpy).not.toHaveBeenCalled();
    }));

    it('should not pan or move anything when dragging empty sky at zoom 1', fakeAsync(() => {
      const toggleSpy = spyOn(editor, 'toggleStar');
      const moveSpy = spyOn(editor, 'moveStar');
      const from = clientPointFor(200, 20);
      const to = clientPointFor(260, 60);

      pressAndRelease(from.clientX, from.clientY, to.clientX, to.clientY);
      tick(STAGE_CLICK_HOLD_MS);

      expect(moveSpy).not.toHaveBeenCalled();
      expect(toggleSpy).not.toHaveBeenCalled();
    }));

    it('should still toggle after sub-threshold pointer jitter', fakeAsync(() => {
      const toggleSpy = spyOn(editor, 'toggleStar');
      const { clientX, clientY } = clientPointFor(300, 150);

      // 2px of travel is finger shake, not a drag.
      pressAndRelease(clientX, clientY, clientX + 2, clientY + 1);
      tick(STAGE_CLICK_HOLD_MS);

      expect(toggleSpy).toHaveBeenCalledOnceWith(1);
    }));

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
