import { computed, inject, Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { AnalyticsService } from '@db-astro-suite/ui';
import { CONTROLS } from '../constants/controls.constants';
import {
  DETECTION_FAILED,
  EXPORT_FAILED,
  EXPORT_NOT_READY,
  IMAGE_LOAD_FAILED,
} from '../constants/editor-messages.constants';
import { DEFAULT_JPEG_QUALITY } from '../constants/export.constants';
import { DEFAULT_PRESET_ID, SPIKE_PRESETS } from '../constants/spike-presets.constants';
import { DetectedStar } from '../models/detected-star.model';
import { StarDetectionError, SupersededError } from '../models/detection.error';
import { EditorControlKey } from '../models/editor-controls.model';
import { ExportFormat, ExportResult } from '../models/export-result.model';
import { ImageLoadError } from '../models/image-load.error';
import { LoadedImage, LoadedImageResult } from '../models/loaded-image.model';
import { SpikePresetId } from '../models/spike-preset.model';
import { SpikeRenderParams } from '../models/spike-render-params.model';
import { fluxReferenceFor } from '../utils/flux-reference.util';
import { applyOverrides } from '../utils/star-overrides.util';
import { sliceCountForValue } from '../utils/stars-cut.util';
import { ImageLoadService } from './image-load.service';
import { SpikeExportService } from './spike-export.service';
import { StarDetectionService } from './star-detection.service';

/**
 * @class SpikeEditorService
 * @description
 * Single source of truth for the AstroSpike editor. Holds the loaded image,
 * the detected star cache, every user control, per-star overrides, and export
 * state as Angular signals, and orchestrates the load → detect → render →
 * export flow across the image, detection, and export services.
 *
 * Detection runs exactly once per loaded image: `allStars` is a flux-sorted
 * cache that control changes never re-compute — the spike cut, overrides, and
 * render params are all derived signals over that cache.
 *
 * @responsibilities
 * - Own image lifecycle (load, replace, clear) and its loading/error state
 * - Run star detection once per image and cache the result
 * - Expose derived render parameters for the preview stage and export
 * - Manage per-star include/exclude overrides and the compare slider
 * - Orchestrate exports and surface every failure to the UI
 */
@Injectable({ providedIn: 'root' })
export class SpikeEditorService implements OnDestroy {
  private readonly imageLoadService = inject(ImageLoadService);
  private readonly starDetectionService = inject(StarDetectionService);
  private readonly spikeExportService = inject(SpikeExportService);
  private readonly analyticsService = inject(AnalyticsService);

  // ==================== Image State ====================

  /** The decoded full-resolution source image, or null before a load. */
  public readonly sourceImage = signal<ImageBitmap | null>(null);

  /** Metadata (name, dimensions) of the loaded image, or null. */
  public readonly imageMeta = signal<LoadedImage | null>(null);

  /** True while a file is being validated and decoded. */
  public readonly isImageLoading = signal<boolean>(false);

  /** User-facing image load error, or null when healthy. */
  public readonly imageError = signal<string | null>(null);

  // ==================== Detection State ====================

  /** True while star detection is running on the loaded image. */
  public readonly isDetecting = signal<boolean>(false);

  /** User-facing detection error, or null when healthy. */
  public readonly detectionError = signal<string | null>(null);

  /**
   * Flux-descending cache of every detected star for the current image.
   * Populated once per load — control changes never trigger re-detection.
   */
  public readonly allStars = signal<readonly DetectedStar[]>([]);

  // ==================== Control State ====================

  /** Identifier of the active spike preset. */
  public readonly presetId = signal<SpikePresetId>(DEFAULT_PRESET_ID);

  /**
   * Config-driven editor slider signals, initialized from CONTROLS metadata:
   * stars (cut), length, brightness, rotation.
   */
  public readonly controls: Record<EditorControlKey, WritableSignal<number>> = {
    stars: signal(CONTROLS['stars'].initial),
    length: signal(CONTROLS['length'].initial),
    brightness: signal(CONTROLS['brightness'].initial),
    rotation: signal(CONTROLS['rotation'].initial),
  };

  /** Number of spike arms rendered per star. */
  public readonly spikeCount = signal<4 | 6>(SPIKE_PRESETS[DEFAULT_PRESET_ID].spikeCount);

  // ==================== Interaction State ====================

  /**
   * Per-star manual overrides keyed by star id: `true` force-includes a star
   * beyond the brightness cut, `false` force-excludes one inside it.
   */
  public readonly overrides = signal<ReadonlyMap<number, boolean>>(new Map());

  /** Id of the star currently under the pointer, or null. */
  public readonly hoveredStarId = signal<number | null>(null);

  /**
   * Id of the star the user last clicked, or null. Selection persists after
   * the click — the ring stays put until the user selects another star or
   * clicks empty sky — so per-star options can hang off it later.
   */
  public readonly selectedStarId = signal<number | null>(null);

  /** Before/after compare divider position in [0, 1]. */
  public readonly comparePosition = signal<number>(0);

  // ==================== Export State ====================

  /** Selected export encoding. */
  public readonly exportFormat = signal<ExportFormat>('png');

  /** JPEG encoder quality in (0, 1]. */
  public readonly jpegQuality = signal<number>(DEFAULT_JPEG_QUALITY);

  /** True while an export is rendering/encoding. */
  public readonly isExporting = signal<boolean>(false);

  /** User-facing export error, or null when healthy. */
  public readonly exportError = signal<string | null>(null);

  /** The most recent successful export, or null. */
  public readonly lastExport = signal<ExportResult | null>(null);

  // ==================== Derived State ====================

  /** The active spike preset object. */
  public readonly preset = computed(() => SPIKE_PRESETS[this.presetId()]);

  /** How many of the brightest stars the stars-cut slider keeps visible. */
  public readonly visibleStarCount = computed(() =>
    sliceCountForValue(this.controls.stars(), this.allStars().length),
  );

  /** Stars that actually receive spikes: brightness cut plus overrides. */
  public readonly renderedStars = computed(() =>
    applyOverrides(this.allStars(), this.visibleStarCount(), this.overrides()),
  );

  /**
   * Everything the spike renderer needs for the current frame, or null until
   * an image is loaded and detection has settled. `scale` stays 1 — the
   * preview stage applies its own preview scale on top.
   */
  public readonly renderParams = computed<SpikeRenderParams | null>(() => {
    const meta = this.imageMeta();
    if (this.sourceImage() === null || meta === null || this.isDetecting()) {
      return null;
    }
    const all = this.allStars();
    const forcedStarIds = new Set<number>();
    for (const [id, forcedOn] of this.overrides()) {
      if (forcedOn) {
        forcedStarIds.add(id);
      }
    }
    return {
      stars: this.renderedStars(),
      // Anchored on the detected list (never the rendered one, so toggling a
      // star off cannot rescale the others) through the outlier-robust
      // reference pick.
      fluxRef: fluxReferenceFor(all),
      forcedStarIds,
      offsetX: 0,
      offsetY: 0,
      preset: this.preset(),
      spikeCount: this.spikeCount(),
      lengthFactor: this.controls.length(),
      intensityFactor: this.controls.brightness(),
      rotationDeg: this.controls.rotation(),
      imageMaxDimension: Math.max(meta.width, meta.height),
      scale: 1,
    };
  });

  /** True once a source image is loaded. */
  public readonly hasImage = computed(() => this.sourceImage() !== null);

  /** True while any load, detection, or export operation is in flight. */
  public readonly isBusy = computed(
    () => this.isImageLoading() || this.isDetecting() || this.isExporting(),
  );

  // ==================== Private State ====================

  /**
   * Monotonic id of the latest {@link loadImage} run. Terminal branches of
   * older runs (including superseded detections) compare against it before
   * touching state, so a stale run can never clobber a newer one.
   */
  private loadGeneration = 0;

  // ==================== Image Lifecycle ====================

  /**
   * Loads a new image and runs star detection on it exactly once.
   *
   * Resets overrides, hover, compare, and errors up front. Every terminal
   * branch — success, load error, detection error, or a superseded detection
   * — settles the loading flags (guarded by the run generation so a stale
   * run never disturbs a newer one).
   *
   * @param file The user-selected image file.
   */
  async loadImage(file: File): Promise<void> {
    const generation = ++this.loadGeneration;
    this.resetInteractionState();
    this.imageError.set(null);
    this.detectionError.set(null);
    this.exportError.set(null);
    this.isImageLoading.set(true);

    let loaded: LoadedImageResult;
    try {
      loaded = await this.imageLoadService.loadImageFile(file);
    } catch (error) {
      if (generation === this.loadGeneration) {
        this.imageError.set(error instanceof ImageLoadError ? error.message : IMAGE_LOAD_FAILED);
      }
      this.settleLoadingFlags(generation);
      return;
    }

    if (generation !== this.loadGeneration) {
      loaded.bitmap.close(); // A newer load owns the editor now.
      return;
    }

    this.sourceImage()?.close();
    this.sourceImage.set(loaded.bitmap);
    this.imageMeta.set(loaded.meta);
    this.allStars.set([]);
    this.isImageLoading.set(false);
    this.isDetecting.set(true);

    try {
      const imageData = this.readImageData(loaded.bitmap);
      const stars = await this.starDetectionService.detect(imageData);
      if (generation === this.loadGeneration) {
        this.allStars.set(stars);
        this.analyticsService.trackEvent('astrospike_image_loaded', {
          width: loaded.meta.width,
          height: loaded.meta.height,
          starCount: stars.length,
        });
      }
    } catch (error) {
      // A superseded run is an expected, silent outcome — a newer image load
      // took over. Anything else surfaces to the user.
      if (!(error instanceof SupersededError) && generation === this.loadGeneration) {
        console.error('Star detection failed:', error);
        this.detectionError.set(DETECTION_FAILED);
      }
    } finally {
      this.settleLoadingFlags(generation);
    }
  }

  /**
   * Clears the loaded image and returns the whole editor to its fresh state:
   * stars, overrides, controls, preset, export state, and every flag.
   */
  clearImage(): void {
    this.loadGeneration++; // Invalidate any in-flight load/detection run.
    this.sourceImage()?.close();
    this.sourceImage.set(null);
    this.imageMeta.set(null);
    this.allStars.set([]);
    this.resetInteractionState();
    this.imageError.set(null);
    this.detectionError.set(null);
    this.exportError.set(null);
    this.lastExport.set(null);
    this.isImageLoading.set(false);
    this.isDetecting.set(false);
    this.isExporting.set(false);
    this.presetId.set(DEFAULT_PRESET_ID);
    this.spikeCount.set(SPIKE_PRESETS[DEFAULT_PRESET_ID].spikeCount);
    for (const key of Object.keys(this.controls) as EditorControlKey[]) {
      this.controls[key].set(CONTROLS[key].initial);
    }
    this.exportFormat.set('png');
    this.jpegQuality.set(DEFAULT_JPEG_QUALITY);
  }

  // ==================== Control Methods ====================

  /**
   * Activates a spike preset: sets the preset id AND its default spike count.
   * The user's slider values are deliberately left unchanged.
   * @param id The preset to activate.
   */
  applyPreset(id: SpikePresetId): void {
    this.presetId.set(id);
    this.spikeCount.set(SPIKE_PRESETS[id].spikeCount);
    this.analyticsService.trackEvent('astrospike_preset_applied', { preset: id });
  }

  /**
   * Updates an editor slider to a new value.
   * @param key The control to update.
   * @param value The new numeric value.
   */
  updateControl(key: EditorControlKey, value: number): void {
    this.controls[key].set(value);
  }

  /**
   * Sets the number of spike arms rendered per star.
   * @param count The new arm count.
   */
  setSpikeCount(count: 4 | 6): void {
    this.spikeCount.set(count);
  }

  /**
   * Toggles whether a star receives spikes. The override map is replaced
   * immutably; when the toggled state equals the star's default visibility
   * (inside the brightness cut) the entry is deleted instead of stored, so
   * the map only ever holds true deviations from the cut. The star also
   * becomes the selected one, so its ring stays visible after the click.
   * @param id Id of the star to toggle.
   */
  toggleStar(id: number): void {
    const stars = this.allStars();
    const index = stars.findIndex((star) => star.id === id);
    if (index === -1) {
      return;
    }
    this.selectedStarId.set(id);
    const isRendered = this.renderedStars().some((star) => star.id === id);
    const target = !isRendered;
    const defaultVisible = index < this.visibleStarCount();
    this.overrides.update((current) => {
      const next = new Map(current);
      if (target === defaultVisible) {
        next.delete(id);
      } else {
        next.set(id, target);
      }
      return next;
    });
  }

  /** Drops the current star selection, hiding its persistent ring. */
  clearStarSelection(): void {
    this.selectedStarId.set(null);
  }

  /**
   * Moves a detected star to a new position, clamped to the image bounds. This
   * is the manual escape hatch for imperfect detection: the user drags the
   * detection onto the star's true centre and the spikes follow. The star list
   * is replaced immutably; flux ordering, ids, overrides, and colour are
   * untouched, so the move survives every slider change exactly like a toggle.
   * @param id Id of the star to move.
   * @param x Target x in full-resolution image pixels.
   * @param y Target y in full-resolution image pixels.
   */
  moveStar(id: number, x: number, y: number): void {
    const meta = this.imageMeta();
    if (meta === null) {
      return;
    }
    const clampedX = Math.min(meta.width, Math.max(0, x));
    const clampedY = Math.min(meta.height, Math.max(0, y));
    this.allStars.update((stars) => {
      const index = stars.findIndex((star) => star.id === id);
      if (index === -1) {
        return stars;
      }
      const next = stars.slice();
      next[index] = { ...next[index], x: clampedX, y: clampedY };
      return next;
    });
  }

  // ==================== Export ====================

  /**
   * Exports the current composited image at full resolution using the active
   * format and quality, retaining the result in {@link lastExport}. Surfaces
   * a guard message when no image/detection is ready and {@link EXPORT_FAILED}
   * on any render/encode failure.
   */
  async exportCurrent(): Promise<void> {
    const bitmap = this.sourceImage();
    const params = this.renderParams();
    const meta = this.imageMeta();
    if (bitmap === null || params === null || meta === null) {
      this.exportError.set(EXPORT_NOT_READY);
      return;
    }
    this.exportError.set(null);
    this.isExporting.set(true);
    try {
      const result = await this.spikeExportService.exportImage(
        bitmap,
        params,
        this.exportFormat(),
        this.jpegQuality(),
        meta.fileName,
      );
      this.lastExport.set(result);
      this.analyticsService.trackEvent('astrospike_export', { format: this.exportFormat() });
    } catch (error) {
      console.error('Export failed:', error);
      this.exportError.set(EXPORT_FAILED);
    } finally {
      this.isExporting.set(false);
    }
  }

  /** Closes the source bitmap on teardown. */
  ngOnDestroy(): void {
    this.loadGeneration++;
    this.sourceImage()?.close();
  }

  // ==================== Private Helpers ====================

  /** Clears overrides, hover, and the compare divider for a fresh image. */
  private resetInteractionState(): void {
    this.overrides.set(new Map());
    this.hoveredStarId.set(null);
    this.selectedStarId.set(null);
    this.comparePosition.set(0);
  }

  /**
   * Settles the loading/detecting flags for a finished run — a no-op when a
   * newer run has taken ownership of the flags.
   * @param generation The finished run's generation id.
   */
  private settleLoadingFlags(generation: number): void {
    if (generation !== this.loadGeneration) {
      return;
    }
    this.isImageLoading.set(false);
    this.isDetecting.set(false);
  }

  /**
   * Draws the bitmap ONCE to a local working canvas and reads its pixels.
   * The ImageData stays local to the load flow — it is handed straight to
   * detection (which transfers the buffer) and never stored.
   * @param bitmap The loaded source image.
   */
  private readImageData(bitmap: ImageBitmap): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx === null) {
      throw new StarDetectionError('Could not create a drawing context for star detection.');
    }
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  }
}
