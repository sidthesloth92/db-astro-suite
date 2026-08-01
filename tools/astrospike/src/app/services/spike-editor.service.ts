import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { AnalyticsService, MOBILE_BREAKPOINT_PX } from '@db-astro-suite/ui';
import { CONTROLS } from '../constants/controls.constants';
import {
  DETECTION_FAILED,
  EXPORT_FAILED,
  EXPORT_NOT_READY,
  IMAGE_LOAD_FAILED,
} from '../constants/editor-messages.constants';
import { DEFAULT_JPEG_QUALITY } from '../constants/export.constants';
import {
  DEFAULT_PRESET_ID,
  DIFFUSION_PRESET_SEED_AMOUNT,
  SPIKE_PRESETS,
} from '../constants/spike-presets.constants';
import {
  MANUAL_STAR_AREA,
  MANUAL_STAR_SNAP_RADIUS_PX,
  MANUAL_STAR_WINDOW_RADIUS_PX,
} from '../constants/manual-star.constants';
import {
  SAMPLE_IMAGE_FILE_NAME,
  SAMPLE_IMAGE_MOBILE_FILE_NAME,
  SAMPLE_IMAGE_MOBILE_URL,
  SAMPLE_IMAGE_URL,
} from '../constants/sample-image.constants';
import { DEFAULT_STAR_ADJUSTMENT } from '../constants/star-adjustment.constants';
import { DetectedStar } from '../models/detected-star.model';
import { StarDetectionError, SupersededError } from '../models/detection.error';
import { EditorControlKey } from '../models/editor-controls.model';
import { ExportFormat, ExportResult } from '../models/export-result.model';
import { ImageLoadError } from '../models/image-load.error';
import { LoadedImage, LoadedImageResult } from '../models/loaded-image.model';
import { SpikePresetId } from '../models/spike-preset.model';
import { SpikeRenderParams } from '../models/spike-render-params.model';
import { StarAdjustment } from '../models/star-adjustment.model';
import { fluxReferenceFor } from '../utils/flux-reference.util';
import { fluxForManualPeak, fluxSortedInsertIndex } from '../utils/manual-star.util';
import { refineStar } from '../utils/star-refine.util';
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
  private readonly document = inject(DOCUMENT);

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
   * stars (cut), length, chroma, diffusion, brightness, rotation.
   */
  public readonly controls: Record<EditorControlKey, WritableSignal<number>> = {
    stars: signal(CONTROLS['stars'].initial),
    length: signal(CONTROLS['length'].initial),
    chroma: signal(CONTROLS['chroma'].initial),
    diffusion: signal(CONTROLS['diffusion'].initial),
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
   * Id of the star whose per-star controls are open in the pane, or null.
   *
   * Opening is a deliberate act (a double-click on the star) — a plain click
   * only toggles that star's spikes and marks nothing, so the canvas stays
   * clean while the user works through a field star by star. While a star IS
   * open, the stage rings it: with its controls docked in the side pane, that
   * ring is the only thing tying the two together.
   */
  public readonly starControlsId = signal<number | null>(null);

  /**
   * Per-star spike tweaks keyed by star id. Only stars the user actually
   * adjusted appear here; everything else renders on the global controls.
   */
  public readonly starAdjustments = signal<ReadonlyMap<number, StarAdjustment>>(new Map());

  /**
   * True while the canvas is in place-a-star mode, where a click marks a star
   * detection missed instead of toggling the spikes of one it found.
   */
  public readonly isAddingStar = signal<boolean>(false);

  /**
   * Ids of stars the user placed by hand. They behave exactly like detected
   * stars once placed — draggable, tunable, toggleable — so this set exists
   * only to keep the reported detection count and their labels honest.
   */
  public readonly manualStarIds = signal<ReadonlySet<number>>(new Set());

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
      adjustments: this.starAdjustments(),
      offsetX: 0,
      offsetY: 0,
      preset: this.preset(),
      spikeCount: this.spikeCount(),
      lengthFactor: this.controls.length(),
      intensityFactor: this.controls.brightness(),
      rotationDeg: this.controls.rotation(),
      diffusionFactor: this.controls.diffusion(),
      chromaFactor: this.controls.chroma(),
      imageMaxDimension: Math.max(meta.width, meta.height),
      scale: 1,
    };
  });

  /** How many stars detection found, excluding any the user placed by hand. */
  public readonly detectedStarCount = computed(
    () => this.allStars().length - this.manualStarIds().size,
  );

  /**
   * True once anything about the look departs from a freshly loaded image:
   * a preset, a slider, a toggled or tuned star, a placed star, or the compare
   * divider. Export format and JPEG quality are deliberately excluded — they
   * describe the output, not the look, and resetting the look should not throw
   * away the user's choice of file type.
   */
  public readonly isDirty = computed(() => {
    if (this.presetId() !== DEFAULT_PRESET_ID) {
      return true;
    }
    if (this.spikeCount() !== SPIKE_PRESETS[DEFAULT_PRESET_ID].spikeCount) {
      return true;
    }
    for (const key of Object.keys(this.controls) as EditorControlKey[]) {
      if (this.controls[key]() !== CONTROLS[key].initial) {
        return true;
      }
    }
    return (
      this.overrides().size > 0 ||
      this.starAdjustments().size > 0 ||
      this.manualStarIds().size > 0 ||
      this.comparePosition() !== 0
    );
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

  /**
   * The Length and Diffusion values as they were the moment the Diffusion
   * preset was entered, or null outside the mode. Entering the mode seeds
   * those two controls, so leaving it restores them — switching back to a
   * spike preset must look the way that preset looked before the detour.
   */
  private diffusionModeSnapshot: { length: number; diffusion: number } | null = null;

  // ==================== Image Lifecycle ====================

  /**
   * Fetches the bundled sample astrophoto and loads it exactly as a dropped
   * file, so a first-time visitor sees spikes on real stars immediately. The
   * sample matches the screen: portrait Cygnus below the mobile breakpoint
   * (a landscape frame leaves most of a phone empty), landscape Pleiades
   * above it.
   *
   * A nicety, not a requirement: if the user beats the fetch with their own
   * image the sample steps aside, and if the fetch fails the studio simply
   * opens on the dropzone — the failure is logged, never shown.
   */
  async loadSampleImage(): Promise<void> {
    // Read the viewport directly: this runs from the app initializer, before
    // BreakpointService has had its first afterNextRender measurement.
    const width = this.document.defaultView?.innerWidth ?? Number.POSITIVE_INFINITY;
    const isMobile = width < MOBILE_BREAKPOINT_PX;
    const url = isMobile ? SAMPLE_IMAGE_MOBILE_URL : SAMPLE_IMAGE_URL;
    const fileName = isMobile ? SAMPLE_IMAGE_MOBILE_FILE_NAME : SAMPLE_IMAGE_FILE_NAME;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Sample image responded ${response.status}`);
      }
      const blob = await response.blob();
      if (this.hasImage() || this.isImageLoading()) {
        return; // The user already loaded their own image; theirs wins.
      }
      await this.loadImage(
        new File([blob], fileName, { type: blob.type || 'image/jpeg' }),
        'sample',
      );
    } catch (error) {
      console.error('Failed to load the sample image:', error);
    }
  }

  /**
   * Loads a new image and runs star detection on it exactly once.
   *
   * Resets overrides, hover, compare, and errors up front. Every terminal
   * branch — success, load error, detection error, or a superseded detection
   * — settles the loading flags (guarded by the run generation so a stale
   * run never disturbs a newer one).
   *
   * @param file The user-selected image file.
   * @param source Where the image came from — the bundled sample or the user.
   *   Carried into analytics so sample pageviews never read as user uploads.
   */
  async loadImage(file: File, source: 'user' | 'sample' = 'user'): Promise<void> {
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
          source,
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
    this.diffusionModeSnapshot = null;
    for (const key of Object.keys(this.controls) as EditorControlKey[]) {
      this.controls[key].set(CONTROLS[key].initial);
    }
    this.exportFormat.set('png');
    this.jpegQuality.set(DEFAULT_JPEG_QUALITY);
  }

  // ==================== Control Methods ====================

  /**
   * Activates a preset: sets the preset id AND its default spike count. For
   * the spike presets the user's slider values are deliberately left
   * unchanged.
   *
   * The Diffusion preset is a mode, so it does touch the sliders: entering it
   * remembers Length and Diffusion, zeroes Length (which removes the arms and
   * their core glow, leaving pure bloom), and seeds Diffusion if it was zero
   * so the mode visibly does something the moment it is picked. Leaving it
   * restores what was remembered, so the spike preset returned to looks
   * exactly as it did before the detour.
   * @param id The preset to activate.
   */
  applyPreset(id: SpikePresetId): void {
    const previous = this.presetId();
    if (id === 'diffusion' && previous !== 'diffusion') {
      this.diffusionModeSnapshot = {
        length: this.controls.length(),
        diffusion: this.controls.diffusion(),
      };
      this.controls.length.set(0);
      if (this.controls.diffusion() === 0) {
        this.controls.diffusion.set(DIFFUSION_PRESET_SEED_AMOUNT);
      }
    } else if (id !== 'diffusion' && previous === 'diffusion' && this.diffusionModeSnapshot !== null) {
      this.controls.length.set(this.diffusionModeSnapshot.length);
      this.controls.diffusion.set(this.diffusionModeSnapshot.diffusion);
      this.diffusionModeSnapshot = null;
    }
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
   * the map only ever holds true deviations from the cut.
   *
   * Toggling deliberately leaves no marker behind: the appearing or vanishing
   * spikes are the feedback, and a ring on every clicked star would litter the
   * image the user is trying to judge.
   * @param id Id of the star to toggle.
   */
  toggleStar(id: number): void {
    const stars = this.allStars();
    const index = stars.findIndex((star) => star.id === id);
    if (index === -1) {
      return;
    }
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

  /**
   * Opens one star's per-star controls in the pane, replacing whichever star
   * was open before, and gives that star spikes if it has none.
   *
   * Whether a star arrives spiked depends on where it falls against the
   * brightness cut. Without the toggle, opening a star from inside the cut
   * would give you working sliders while opening a fainter one would give you
   * three sliders that visibly do nothing — the same gesture behaving two
   * different ways. The panel's own button reverses it in one click.
   * @param id Id of the star to edit.
   */
  openStarControls(id: number): void {
    if (!this.renderedStars().some((star) => star.id === id)) {
      this.toggleStar(id);
    }
    this.starControlsId.set(id);
  }

  /** Closes the per-star controls and drops the stage's editing ring. */
  closeStarControls(): void {
    this.starControlsId.set(null);
  }

  /**
   * Returns the tweaks applied to a star, or the neutral default when it has
   * never been adjusted.
   * @param id Id of the star to read.
   */
  adjustmentFor(id: number): StarAdjustment {
    return this.starAdjustments().get(id) ?? DEFAULT_STAR_ADJUSTMENT;
  }

  /**
   * Applies a partial tweak to one star, merging it over whatever that star
   * already carried. The map is replaced immutably, and an adjustment that
   * returns to the neutral default is deleted rather than stored so the map
   * only ever holds real deviations.
   * @param id Id of the star to adjust.
   * @param patch The fields to change.
   */
  adjustStar(id: number, patch: Partial<StarAdjustment>): void {
    this.starAdjustments.update((current) => {
      const next = new Map(current);
      const merged: StarAdjustment = { ...this.adjustmentFor(id), ...patch };
      const isDefault =
        merged.lengthFactor === DEFAULT_STAR_ADJUSTMENT.lengthFactor &&
        merged.intensityFactor === DEFAULT_STAR_ADJUSTMENT.intensityFactor &&
        merged.rotationDeg === DEFAULT_STAR_ADJUSTMENT.rotationDeg &&
        merged.diffusion === DEFAULT_STAR_ADJUSTMENT.diffusion;
      if (isDefault) {
        next.delete(id);
      } else {
        next.set(id, merged);
      }
      return next;
    });
  }

  /**
   * Drops a star's tweaks, returning it to the global controls.
   * @param id Id of the star to reset.
   */
  resetStarAdjustment(id: number): void {
    this.starAdjustments.update((current) => {
      if (!current.has(id)) {
        return current;
      }
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }

  /**
   * Returns the whole look to how a freshly loaded image arrives: default
   * preset and arm count, every slider back to its initial value, every
   * per-star toggle and tweak dropped, every hand-placed star removed, and the
   * compare divider closed.
   *
   * The image itself and its detected stars survive — detection is expensive
   * and its result has not changed. Export format and quality survive too, for
   * the reason given on {@link isDirty}.
   */
  resetAll(): void {
    const placed = this.manualStarIds();
    if (placed.size > 0) {
      this.allStars.update((stars) => stars.filter((star) => !placed.has(star.id)));
    }
    this.presetId.set(DEFAULT_PRESET_ID);
    this.spikeCount.set(SPIKE_PRESETS[DEFAULT_PRESET_ID].spikeCount);
    this.diffusionModeSnapshot = null;
    for (const key of Object.keys(this.controls) as EditorControlKey[]) {
      this.controls[key].set(CONTROLS[key].initial);
    }
    this.resetInteractionState();
    this.analyticsService.trackEvent('astrospike_reset', {});
  }

  /**
   * Enters or leaves place-a-star mode.
   *
   * Leaving also drops the selection. Placing a star selects it so it can be
   * tuned straight away, so by the time the user switches the tool off there is
   * a bar open for whichever star they placed last — and they have finished
   * with it, or they would not be leaving.
   */
  toggleAddStarMode(): void {
    const adding = !this.isAddingStar();
    this.isAddingStar.set(adding);
    if (!adding) {
      this.closeStarControls();
    }
  }

  /** True when a star was placed by hand rather than found by detection. */
  isManualStar(id: number): boolean {
    return this.manualStarIds().has(id);
  }

  /**
   * Places a star at a point detection missed, and gives it spikes.
   *
   * The point is measured on the full-resolution image exactly as detection
   * measures the stars it finds — same window, same local background, same
   * peak and colour — so a placed star is indistinguishable from a detected one
   * downstream. Its flux is borrowed from the detected star of nearest peak
   * brightness, which is what makes its spike match the field rather than
   * arriving at some arbitrary size.
   *
   * It is force-included regardless of where the brightness cut sits, since
   * placing a star is a request to see a spike there.
   *
   * @param x Target x in full-resolution image pixels.
   * @param y Target y in full-resolution image pixels.
   * @returns Id of the placed star, or null when nothing could be placed.
   */
  addStarAt(x: number, y: number): number | null {
    const bitmap = this.sourceImage();
    if (bitmap === null) {
      return null;
    }
    const window = this.readWindowAround(bitmap, x, y);
    if (window === null) {
      return null;
    }
    const refined = refineStar(
      window.data,
      window.width,
      window.height,
      x - window.originX,
      y - window.originY,
      MANUAL_STAR_WINDOW_RADIUS_PX,
    );
    // Snap to the measured core only when it is genuinely close; otherwise the
    // click wins. See MANUAL_STAR_SNAP_RADIUS_PX.
    const measuredX = window.originX + refined.x;
    const measuredY = window.originY + refined.y;
    const snapped = Math.hypot(measuredX - x, measuredY - y) <= MANUAL_STAR_SNAP_RADIUS_PX;
    const stars = this.allStars();
    const id = stars.reduce((highest, star) => Math.max(highest, star.id), -1) + 1;
    const placed: DetectedStar = {
      id,
      x: snapped ? measuredX : x,
      y: snapped ? measuredY : y,
      flux: fluxForManualPeak(stars, refined.peak),
      peak: refined.peak,
      area: MANUAL_STAR_AREA,
      elongation: 1,
      color: refined.color,
    };
    this.allStars.update((current) => {
      const next = current.slice();
      next.splice(fluxSortedInsertIndex(current, placed.flux), 0, placed);
      return next;
    });
    this.manualStarIds.update((current) => new Set(current).add(id));
    this.overrides.update((current) => new Map(current).set(id, true));
    this.analyticsService.trackEvent('astrospike_star_added', { starCount: stars.length + 1 });
    return id;
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
    this.starAdjustments.set(new Map());
    this.hoveredStarId.set(null);
    this.starControlsId.set(null);
    this.manualStarIds.set(new Set());
    this.isAddingStar.set(false);
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
   * Reads a small square of full-resolution pixels around an image point.
   *
   * Deliberately a window rather than the whole frame: the full read that
   * detection performs costs 4 bytes a pixel, which is a third of a gigabyte on
   * a 60-megapixel image, and placing one star needs a few thousand pixels.
   *
   * @param bitmap The decoded source image.
   * @param x Centre x in full-resolution pixels.
   * @param y Centre y in full-resolution pixels.
   * @returns The window's pixels and its origin, or null without a context.
   */
  private readWindowAround(
    bitmap: ImageBitmap,
    x: number,
    y: number,
  ): { data: Uint8ClampedArray; width: number; height: number; originX: number; originY: number } | null {
    const radius = MANUAL_STAR_WINDOW_RADIUS_PX;
    const centerX = Math.min(bitmap.width - 1, Math.max(0, Math.round(x)));
    const centerY = Math.min(bitmap.height - 1, Math.max(0, Math.round(y)));
    const originX = Math.max(0, centerX - radius);
    const originY = Math.max(0, centerY - radius);
    const width = Math.min(bitmap.width - originX, radius * 2 + 1);
    const height = Math.min(bitmap.height - originY, radius * 2 + 1);
    if (width <= 0 || height <= 0) {
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx === null) {
      return null;
    }
    ctx.drawImage(bitmap, originX, originY, width, height, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    return { data: imageData.data, width, height, originX, originY };
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
