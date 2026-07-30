import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import {
  DETECTION_FAILED,
  EXPORT_FAILED,
  EXPORT_NOT_READY,
} from '../constants/editor-messages.constants';
import { DetectedStar } from '../models/detected-star.model';
import { SupersededError } from '../models/detection.error';
import { ExportResult } from '../models/export-result.model';
import { UnsupportedFormatError } from '../models/image-load.error';
import { ImageLoadService } from './image-load.service';
import { SpikeEditorService } from './spike-editor.service';
import { SpikeExportService } from './spike-export.service';
import { StarDetectionService } from './star-detection.service';

/** Builds a detected star with the given id and flux (id = sorted index). */
function makeStar(id: number, flux: number): DetectedStar {
  return {
    id,
    x: 10 + id,
    y: 20 + id,
    flux,
    peak: flux / 10,
    area: 4,
    elongation: 1.1,
    color: { r: 255, g: 250, b: 240 },
  };
}

/** Four flux-descending stars matching the id = index contract. */
const STARS: readonly DetectedStar[] = [
  makeStar(0, 400),
  makeStar(1, 300),
  makeStar(2, 200),
  makeStar(3, 100),
];

/** Builds a small real ImageBitmap so the working-canvas draw succeeds. */
async function buildBitmap(width: number, height: number): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('spec canvas has no 2d context');
  }
  ctx.fillStyle = '#0a1020';
  ctx.fillRect(0, 0, width, height);
  return createImageBitmap(canvas);
}

describe('SpikeEditorService', () => {
  let service: SpikeEditorService;
  let imageLoadSpy: jasmine.SpyObj<ImageLoadService>;
  let detectionSpy: jasmine.SpyObj<StarDetectionService>;
  let exportSpy: jasmine.SpyObj<SpikeExportService>;
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;

  beforeEach(() => {
    imageLoadSpy = jasmine.createSpyObj<ImageLoadService>('ImageLoadService', ['loadImageFile']);
    detectionSpy = jasmine.createSpyObj<StarDetectionService>('StarDetectionService', ['detect']);
    exportSpy = jasmine.createSpyObj<SpikeExportService>('SpikeExportService', ['exportImage']);
    analyticsSpy = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['trackEvent']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ImageLoadService, useValue: imageLoadSpy },
        { provide: StarDetectionService, useValue: detectionSpy },
        { provide: SpikeExportService, useValue: exportSpy },
        { provide: AnalyticsService, useValue: analyticsSpy },
      ],
    });
    service = TestBed.inject(SpikeEditorService);
  });

  describe('loadImage', () => {
    it('should populate image and star signals and settle flags on success', async () => {
      const bitmap = await buildBitmap(8, 8);
      const meta = { fileName: 'm31.png', width: 8, height: 8 };
      imageLoadSpy.loadImageFile.and.resolveTo({ bitmap, meta });
      detectionSpy.detect.and.resolveTo([...STARS]);

      await service.loadImage(new File([''], 'm31.png', { type: 'image/png' }));

      expect(service.sourceImage()).toBe(bitmap);
      expect(service.imageMeta()).toEqual(meta);
      expect(service.allStars()).toEqual(STARS);
      expect(service.isImageLoading()).toBeFalse();
      expect(service.isDetecting()).toBeFalse();
      expect(service.imageError()).toBeNull();
      expect(service.detectionError()).toBeNull();
      expect(analyticsSpy.trackEvent).toHaveBeenCalledWith('astrospike_image_loaded', {
        width: 8,
        height: 8,
        starCount: STARS.length,
        source: 'user',
      });
      expect(service.renderParams()).not.toBeNull();
    });

    it('should surface the load error message and settle flags on load failure', async () => {
      const error = new UnsupportedFormatError();
      imageLoadSpy.loadImageFile.and.rejectWith(error);

      await service.loadImage(new File([''], 'notes.txt', { type: 'text/plain' }));

      expect(service.imageError()).toBe(error.message);
      expect(service.isImageLoading()).toBeFalse();
      expect(service.isDetecting()).toBeFalse();
      expect(service.sourceImage()).toBeNull();
      expect(detectionSpy.detect).not.toHaveBeenCalled();
    });

    it('should surface a detection error and settle flags on detection failure', async () => {
      const bitmap = await buildBitmap(8, 8);
      imageLoadSpy.loadImageFile.and.resolveTo({
        bitmap,
        meta: { fileName: 'm31.png', width: 8, height: 8 },
      });
      detectionSpy.detect.and.rejectWith(new Error('detection exploded'));

      await service.loadImage(new File([''], 'm31.png', { type: 'image/png' }));

      expect(service.detectionError()).toBe(DETECTION_FAILED);
      expect(service.isImageLoading()).toBeFalse();
      expect(service.isDetecting()).toBeFalse();
    });

    it('should stay silent when detection is superseded by a newer run', async () => {
      const bitmap = await buildBitmap(8, 8);
      imageLoadSpy.loadImageFile.and.resolveTo({
        bitmap,
        meta: { fileName: 'm31.png', width: 8, height: 8 },
      });
      detectionSpy.detect.and.rejectWith(new SupersededError());

      await service.loadImage(new File([''], 'm31.png', { type: 'image/png' }));

      expect(service.detectionError()).toBeNull();
      expect(service.isDetecting()).toBeFalse();
    });
  });

  describe('presets and controls', () => {
    it('should apply a preset and adopt its default spike count', () => {
      service.applyPreset('jwst');

      expect(service.presetId()).toBe('jwst');
      expect(service.spikeCount()).toBe(6);
      expect(analyticsSpy.trackEvent).toHaveBeenCalledWith('astrospike_preset_applied', {
        preset: 'jwst',
      });
    });

    it('should leave slider values unchanged when applying a preset', () => {
      service.updateControl('length', 2.5);
      service.applyPreset('subtle');
      expect(service.controls.length()).toBe(2.5);
    });
  });

  describe('star cut and overrides', () => {
    beforeEach(() => {
      service.allStars.set(STARS);
      service.updateControl('stars', 0.5); // round(4^0.5) = 2 visible by default
    });

    it('should render only the stars inside the brightness cut by default', () => {
      expect(service.visibleStarCount()).toBe(2);
      expect(service.renderedStars().map((s) => s.id)).toEqual([0, 1]);
    });

    it('should force-include a star beyond the cut when toggled', () => {
      service.toggleStar(3);
      expect(service.overrides().get(3)).toBeTrue();
      expect(service.renderedStars().map((s) => s.id)).toEqual([0, 1, 3]);
    });

    it('should delete the override entry when a toggle restores default visibility', () => {
      service.toggleStar(3);
      service.toggleStar(3);
      expect(service.overrides().has(3)).toBeFalse();
      expect(service.renderedStars().map((s) => s.id)).toEqual([0, 1]);
    });

    it('should force-exclude a star inside the cut when toggled', () => {
      service.toggleStar(0);
      expect(service.overrides().get(0)).toBeFalse();
      expect(service.renderedStars().map((s) => s.id)).toEqual([1]);
    });
  });

  describe('per-star controls', () => {
    beforeEach(() => {
      service.allStars.set(STARS);
    });

    it('should mark no star when spikes are merely toggled', () => {
      service.toggleStar(2);
      expect(service.starControlsId()).toBeNull();
    });

    it('should open the controls for the star the user asked to edit', () => {
      service.openStarControls(2);
      expect(service.starControlsId()).toBe(2);
    });

    it('should spike a star that had none when its controls are opened', () => {
      // Star 3 sits below the default brightness cut, so it starts bare and
      // its sliders would otherwise have nothing to act on.
      expect(service.renderedStars().map((star) => star.id)).not.toContain(3);

      service.openStarControls(3);

      expect(service.renderedStars().map((star) => star.id)).toContain(3);
    });

    it('should leave an already spiked star exactly as it was', () => {
      const before = service.renderedStars().map((star) => star.id);
      expect(before).toContain(0);

      service.openStarControls(0);

      expect(service.renderedStars().map((star) => star.id)).toEqual(before);
    });

    it('should move the open controls to the most recently edited star', () => {
      service.openStarControls(1);
      service.openStarControls(3);
      expect(service.starControlsId()).toBe(3);
    });

    it('should close the controls on demand', () => {
      service.openStarControls(0);
      service.closeStarControls();
      expect(service.starControlsId()).toBeNull();
    });

    it('should close the controls when the image is cleared', () => {
      service.openStarControls(0);
      service.clearImage();
      expect(service.starControlsId()).toBeNull();
    });
  });

  describe('diffusion', () => {
    beforeEach(() => {
      service.allStars.set(STARS);
    });

    it('should start at zero so a preset renders exactly as it always did', () => {
      expect(service.controls.diffusion()).toBe(0);
      expect(service.renderParams()).toBeNull(); // no image yet
    });

    it('should carry the global amount into the render params', async () => {
      const bitmap = await buildBitmap(8, 8);
      imageLoadSpy.loadImageFile.and.resolveTo({
        bitmap,
        meta: { fileName: 'm31.png', width: 8, height: 8 },
      });
      detectionSpy.detect.and.resolveTo([...STARS]);
      await service.loadImage(new File([''], 'm31.png', { type: 'image/png' }));

      service.updateControl('diffusion', 0.6);

      expect(service.renderParams()?.diffusionFactor).toBe(0.6);
    });

    it('should carry the chroma amount into the render params', async () => {
      const bitmap = await buildBitmap(8, 8);
      imageLoadSpy.loadImageFile.and.resolveTo({
        bitmap,
        meta: { fileName: 'm31.png', width: 8, height: 8 },
      });
      detectionSpy.detect.and.resolveTo([...STARS]);
      await service.loadImage(new File([''], 'm31.png', { type: 'image/png' }));

      service.updateControl('chroma', 0.75);

      expect(service.renderParams()?.chromaFactor).toBe(0.75);
    });

    it('should pin one star to its own amount, absolute rather than relative', () => {
      // The global control stays at zero, which a multiplier could never
      // escape — the whole reason the per-star value is absolute.
      expect(service.controls.diffusion()).toBe(0);

      service.adjustStar(1, { diffusion: 0.8 });

      expect(service.adjustmentFor(1).diffusion).toBe(0.8);
      expect(service.adjustmentFor(0).diffusion).toBeNull();
    });

    it('should let a star pin zero while the global amount is high', () => {
      service.updateControl('diffusion', 1);
      service.adjustStar(1, { diffusion: 0 });

      expect(service.adjustmentFor(1).diffusion).toBe(0);
      // A pinned zero is a real deviation, so the entry must be kept.
      expect(service.starAdjustments().has(1)).toBeTrue();
    });

    it('should return a pinned star to the global amount on reset', () => {
      service.adjustStar(1, { diffusion: 0.5 });

      service.resetStarAdjustment(1);

      expect(service.adjustmentFor(1).diffusion).toBeNull();
      expect(service.starAdjustments().has(1)).toBeFalse();
    });
  });

  describe('addStarAt', () => {
    beforeEach(async () => {
      const bitmap = await buildBitmap(64, 64);
      imageLoadSpy.loadImageFile.and.resolveTo({
        bitmap,
        meta: { fileName: 'm31.png', width: 64, height: 64 },
      });
      detectionSpy.detect.and.resolveTo([...STARS]);
      await service.loadImage(new File([''], 'm31.png', { type: 'image/png' }));
    });

    it('should add a star to the list and spike it', () => {
      service.addStarAt(30, 30);

      expect(service.allStars().length).toBe(STARS.length + 1);
      const placed = service.allStars().find((star) => !STARS.some((s) => s.id === star.id));
      expect(placed).toBeDefined();
      // Force-included, because placing a star is a request to see a spike.
      expect(service.renderedStars().map((star) => star.id)).toContain(placed!.id);
    });

    it('should keep the list sorted by flux after the insert', () => {
      service.addStarAt(20, 20);

      const fluxes = service.allStars().map((star) => star.flux);
      expect(fluxes).toEqual([...fluxes].sort((a, b) => b - a));
    });

    it('should give the placed star an id no detected star already holds', () => {
      service.addStarAt(20, 20);
      service.addStarAt(40, 40);

      const ids = service.allStars().map((star) => star.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should record it as placed rather than detected', () => {
      service.addStarAt(30, 30);
      const placed = service.allStars().find((star) => service.isManualStar(star.id));

      expect(placed).toBeDefined();
      // The pill must keep reporting what detection actually found.
      expect(service.detectedStarCount()).toBe(STARS.length);
      expect(service.manualStarIds().size).toBe(1);
    });

    it('should honour the click position on a featureless patch', () => {
      // The stub image is flat, so measurement has no real core to find and
      // must not drag the star away from where the user put it.
      service.addStarAt(30, 40);
      const placed = service.allStars().find((star) => service.isManualStar(star.id));

      expect(placed!.x).toBeCloseTo(30, 0);
      expect(placed!.y).toBeCloseTo(40, 0);
    });

    it('should do nothing when no image is loaded', () => {
      service.clearImage();
      service.addStarAt(10, 10);

      expect(service.allStars()).toEqual([]);
      expect(service.manualStarIds().size).toBe(0);
    });

    it('should toggle a placed star like any other', () => {
      service.addStarAt(30, 30);
      const id = Array.from(service.manualStarIds())[0];

      service.toggleStar(id);

      expect(service.renderedStars().map((star) => star.id)).not.toContain(id);
    });
  });

  describe('placing and selecting', () => {
    beforeEach(async () => {
      const bitmap = await buildBitmap(64, 64);
      imageLoadSpy.loadImageFile.and.resolveTo({
        bitmap,
        meta: { fileName: 'm31.png', width: 64, height: 64 },
      });
      detectionSpy.detect.and.resolveTo([...STARS]);
      await service.loadImage(new File([''], 'm31.png', { type: 'image/png' }));
    });

    it('should report the id it placed so the caller can select it', () => {
      const id = service.addStarAt(30, 30);

      expect(id).not.toBeNull();
      expect(service.isManualStar(id!)).toBeTrue();
    });

    it('should return null when there is no image to place onto', () => {
      service.clearImage();
      expect(service.addStarAt(10, 10)).toBeNull();
    });

    it('should drop the selection when the mode is switched off', () => {
      service.toggleAddStarMode();
      const id = service.addStarAt(30, 30);
      service.openStarControls(id!);
      expect(service.starControlsId()).toBe(id);

      service.toggleAddStarMode();

      expect(service.isAddingStar()).toBeFalse();
      expect(service.starControlsId()).toBeNull();
      // The stars themselves survive; only the selection is cleared.
      expect(service.manualStarIds().size).toBe(1);
    });

    it('should leave the selection alone when the mode is switched on', () => {
      service.openStarControls(1);

      service.toggleAddStarMode();

      expect(service.starControlsId()).toBe(1);
    });
  });

  describe('place-a-star mode', () => {
    it('should start disarmed and toggle', () => {
      expect(service.isAddingStar()).toBeFalse();
      service.toggleAddStarMode();
      expect(service.isAddingStar()).toBeTrue();
      service.toggleAddStarMode();
      expect(service.isAddingStar()).toBeFalse();
    });

    it('should disarm when the image is cleared', () => {
      service.toggleAddStarMode();
      service.clearImage();
      expect(service.isAddingStar()).toBeFalse();
    });
  });

  describe('resetAll', () => {
    beforeEach(async () => {
      const bitmap = await buildBitmap(64, 64);
      imageLoadSpy.loadImageFile.and.resolveTo({
        bitmap,
        meta: { fileName: 'm31.png', width: 64, height: 64 },
      });
      detectionSpy.detect.and.resolveTo([...STARS]);
      await service.loadImage(new File([''], 'm31.png', { type: 'image/png' }));
    });

    it('should report a freshly loaded image as clean', () => {
      expect(service.isDirty()).toBeFalse();
    });

    const dirtiers: ReadonlyArray<{ name: string; act: () => void }> = [
      { name: 'a preset change', act: () => service.applyPreset('jwst') },
      { name: 'a slider move', act: () => service.updateControl('length', 2) },
      { name: 'an arm count override', act: () => service.setSpikeCount(6) },
      { name: 'a toggled star', act: () => service.toggleStar(0) },
      { name: 'a tuned star', act: () => service.adjustStar(1, { lengthFactor: 2 }) },
      { name: 'a placed star', act: () => service.addStarAt(20, 20) },
      { name: 'a moved divider', act: () => service.comparePosition.set(0.4) },
    ];

    for (const { name, act } of dirtiers) {
      it(`should become dirty after ${name}`, () => {
        act();
        expect(service.isDirty()).toBeTrue();
      });
    }

    it('should stay clean when only the export format changes', () => {
      // Output preference is not part of the look, so Reset has no business
      // discarding it and must not light up for it either.
      service.exportFormat.set('layer');
      service.jpegQuality.set(0.6);

      expect(service.isDirty()).toBeFalse();
    });

    it('should return every control, toggle and tweak to its default', () => {
      service.applyPreset('jwst');
      service.setSpikeCount(4);
      service.updateControl('length', 2.4);
      service.updateControl('chroma', 1);
      service.updateControl('diffusion', 0.8);
      service.toggleStar(0);
      service.adjustStar(2, { diffusion: 0.5 });
      service.comparePosition.set(0.6);

      service.resetAll();

      expect(service.presetId()).toBe('classic');
      expect(service.spikeCount()).toBe(4);
      expect(service.controls.length()).toBe(1);
      expect(service.controls.chroma()).toBe(0.35);
      expect(service.controls.diffusion()).toBe(0);
      expect(service.overrides().size).toBe(0);
      expect(service.starAdjustments().size).toBe(0);
      expect(service.comparePosition()).toBe(0);
      expect(service.isDirty()).toBeFalse();
    });

    it('should remove placed stars from the list, not merely unspike them', () => {
      service.addStarAt(20, 20);
      expect(service.allStars().length).toBe(STARS.length + 1);

      service.resetAll();

      expect(service.allStars().length).toBe(STARS.length);
      expect(service.manualStarIds().size).toBe(0);
    });

    it('should keep the image and its detections — detection is not re-run', () => {
      service.applyPreset('jwst');
      detectionSpy.detect.calls.reset();

      service.resetAll();

      expect(service.sourceImage()).not.toBeNull();
      expect(service.allStars().length).toBe(STARS.length);
      expect(detectionSpy.detect).not.toHaveBeenCalled();
    });

    it('should keep the export format and quality', () => {
      service.exportFormat.set('layer');
      service.jpegQuality.set(0.6);
      service.applyPreset('jwst');

      service.resetAll();

      expect(service.exportFormat()).toBe('layer');
      expect(service.jpegQuality()).toBe(0.6);
    });
  });

  describe('moveStar', () => {
    beforeEach(() => {
      service.imageMeta.set({ fileName: 'm82.png', width: 500, height: 300 });
      service.allStars.set(STARS);
    });

    it('should reposition the star and keep every other property intact', () => {
      const original = service.allStars();

      service.moveStar(1, 250.5, 120.25);

      const moved = service.allStars().find((s) => s.id === 1);
      expect(moved?.x).toBe(250.5);
      expect(moved?.y).toBe(120.25);
      expect(moved?.flux).toBe(300);
      // Immutable replacement, not in-place mutation.
      expect(service.allStars()).not.toBe(original);
      expect(original.find((s) => s.id === 1)?.x).toBe(11);
    });

    it('should clamp the target position to the image bounds', () => {
      service.moveStar(0, -40, 900);

      const moved = service.allStars().find((s) => s.id === 0);
      expect(moved?.x).toBe(0);
      expect(moved?.y).toBe(300);
    });

    it('should flow the new position into the rendered stars', () => {
      service.updateControl('stars', 1);
      service.moveStar(2, 33, 44);
      const rendered = service.renderedStars().find((s) => s.id === 2);
      expect(rendered?.x).toBe(33);
      expect(rendered?.y).toBe(44);
    });

    it('should ignore an unknown id and a missing image', () => {
      const before = service.allStars();
      service.moveStar(99, 5, 5);
      expect(service.allStars()).toBe(before);

      service.imageMeta.set(null);
      service.moveStar(0, 5, 5);
      expect(service.allStars()).toBe(before);
    });
  });

  describe('exportCurrent', () => {
    it('should set a guard error when no image is ready', async () => {
      await service.exportCurrent();
      expect(service.exportError()).toBe(EXPORT_NOT_READY);
      expect(exportSpy.exportImage).not.toHaveBeenCalled();
    });

    it('should export, retain the result, and track the event on success', async () => {
      const bitmap = await buildBitmap(8, 8);
      service.sourceImage.set(bitmap);
      service.imageMeta.set({ fileName: 'm31.png', width: 8, height: 8 });
      service.allStars.set(STARS);
      const result: ExportResult = {
        blob: new Blob(['x']),
        filename: 'm31_astrospike_8_8.png',
        sizeBytes: 1,
      };
      exportSpy.exportImage.and.resolveTo(result);

      await service.exportCurrent();

      expect(exportSpy.exportImage).toHaveBeenCalled();
      expect(service.lastExport()).toBe(result);
      expect(service.exportError()).toBeNull();
      expect(service.isExporting()).toBeFalse();
      expect(analyticsSpy.trackEvent).toHaveBeenCalledWith('astrospike_export', {
        format: 'png',
      });
    });

    it('should surface an export error and settle the flag on failure', async () => {
      const bitmap = await buildBitmap(8, 8);
      service.sourceImage.set(bitmap);
      service.imageMeta.set({ fileName: 'm31.png', width: 8, height: 8 });
      service.allStars.set(STARS);
      exportSpy.exportImage.and.rejectWith(new Error('encode failed'));

      await service.exportCurrent();

      expect(service.exportError()).toBe(EXPORT_FAILED);
      expect(service.lastExport()).toBeNull();
      expect(service.isExporting()).toBeFalse();
    });
  });
});
