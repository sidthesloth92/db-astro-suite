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
