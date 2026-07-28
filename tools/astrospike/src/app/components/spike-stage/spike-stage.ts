import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ConstellationLoaderComponent, PillBadgeComponent, TextButtonComponent } from '@db-astro-suite/ui';
import {
  HIT_TEST_RADIUS_CSS_PX,
  PREVIEW_MAX_DIMENSION,
  STAGE_DRAG_THRESHOLD_CSS_PX,
  STAGE_MAX_ZOOM,
  STAGE_MIN_ZOOM,
  STAGE_WHEEL_ZOOM_FACTOR,
} from '../../constants/render.constants';
import {
  HOVER_MARKER_RADIUS_CSS_PX,
  MARKER_LINE_WIDTH_CSS_PX,
  SELECTED_MARKER_RADIUS_CSS_PX,
} from '../../constants/star-marker.constants';
import { DetectedStar } from '../../models/detected-star.model';
import { SpriteCache } from '../../models/spike-render-params.model';
import { StageViewport } from '../../models/stage-viewport.model';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { pointerToImagePoint } from '../../utils/canvas-coords.util';
import { findNearestStar } from '../../utils/hit-test.util';
import { renderSpikes } from '../../utils/spike-render.util';
import {
  clampViewport,
  panViewport,
  viewportOrigin,
  zoomViewportAt,
} from '../../utils/stage-viewport.util';
import { drawStarMarkers } from '../../utils/star-markers.util';
import { CompareHandle } from '../compare-handle/compare-handle';
import { ImageDropzone } from '../image-dropzone/image-dropzone';

/**
 * Preview stage — owns the render pipeline from the loaded source image to the
 * visible canvases. Three canvases share one backing-store size and one CSS
 * box inside `.stage-frame`, so they are pixel-aligned by construction:
 *
 * - the "before" canvas holds the source image scaled to preview size, drawn
 *   exactly once per load and blitted at the start of every render frame;
 * - the "after" canvas is that blit plus the spikes from `renderSpikes`,
 *   revealed by a clip-path wipe driven by the compare divider;
 * - a transparent marker canvas on top carries the hover and disabled-star
 *   rings and receives all stage pointer events.
 *
 * The three concerns are deliberately kept on separate effects: dragging the
 * compare divider only re-evaluates a clip-path binding, and hovering a star
 * only repaints the marker overlay — neither re-renders the spikes.
 *
 * Also hosts the stage overlays: the image dropzone when empty, the
 * constellation loader while loading/detecting, the error banner, and the
 * "N stars detected" pill. Dropping a file anywhere on the stage (even with
 * an image already loaded) loads it as the new source image.
 */
@Component({
  selector: 'dba-as-spike-stage',
  standalone: true,
  imports: [
    CompareHandle,
    ConstellationLoaderComponent,
    ImageDropzone,
    PillBadgeComponent,
    TextButtonComponent,
  ],
  templateUrl: './spike-stage.html',
  styleUrl: './spike-stage.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpikeStage {
  /** Shared editor state — image, detection, controls, and render params. */
  protected readonly editor = inject(SpikeEditorService);

  /** Host element — marker colors are resolved from its computed style. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Base preview canvas: the source image scaled to preview size, drawn once
   * per load. It is both the untouched "before" view and the blit source for
   * every "after" frame.
   */
  private readonly beforeCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('beforeCanvas');

  /** Visible "after" canvas the composited preview is drawn onto. */
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('afterCanvas');

  /** Transparent overlay canvas carrying the hover and disabled-star rings. */
  private readonly markerCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('markerCanvas');

  /** Sprite cache shared across render frames (keyed by color/gamma). */
  private readonly spriteCache: SpriteCache = new Map();

  /** Scale from full-resolution image pixels to preview canvas pixels. */
  private readonly previewScale = signal(1);

  /**
   * Zoom/pan state in image space. Zoomed frames render straight from the
   * full-resolution bitmap, so zooming reveals true detail rather than
   * upscaled preview pixels.
   */
  protected readonly viewport = signal<StageViewport>({ zoom: 1, centerX: 0, centerY: 0 });

  /** True while a pan drag is in progress — drives the grabbing cursor. */
  protected readonly isPanning = signal(false);

  /**
   * Offscreen cache of the source image at preview scale — the blit source for
   * un-zoomed frames, so the full bitmap is only resampled when zoomed.
   */
  private basePreviewCanvas: HTMLCanvasElement | null = null;

  /** Pointer id of the press being tracked for the click-vs-drag decision. */
  private dragPointerId: number | null = null;

  /**
   * Star under the pointer when it was pressed, or null when the press began
   * on empty sky. A travelling press moves this star; on empty sky it pans.
   */
  private dragStarId: number | null = null;

  /** True while the tracked press is repositioning a star. */
  protected readonly isMovingStar = signal(false);

  /** CSS position of the tracked press, to measure travel against. */
  private dragStartX = 0;

  /** CSS y of the tracked press. */
  private dragStartY = 0;

  /** CSS position of the previous pan step. */
  private dragLastX = 0;

  /** CSS y of the previous pan step. */
  private dragLastY = 0;

  /** Pending requestAnimationFrame id, or null when no frame is scheduled. */
  private frameId: number | null = null;

  /** Resolved CSS color of the hover ring, or '' before it is read. */
  private hoverMarkerColor = '';

  /** Resolved CSS color of the selection ring, or '' before it is read. */
  private selectedMarkerColor = '';

  /** True once both marker colors resolved to a non-empty value. */
  private hasMarkerColors = false;

  /** True while the image is loading or star detection is running. */
  protected readonly isProcessing = computed(
    () => this.editor.isImageLoading() || this.editor.isDetecting(),
  );

  /** Status line shown under the loader while processing. */
  protected readonly statusLine = computed(() =>
    this.editor.isDetecting() ? 'Detecting stars…' : 'Loading image…',
  );

  /** First load/detection error to surface, or null when healthy. */
  protected readonly stageError = computed(
    () => this.editor.imageError() ?? this.editor.detectionError(),
  );

  /** True when the empty-state dropzone overlay should render. */
  protected readonly showDropzone = computed(
    () => !this.editor.hasImage() && !this.isProcessing() && this.stageError() === null,
  );

  /** True once an image is loaded, settled, and healthy — the editable state. */
  private readonly isStageReady = computed(
    () => this.editor.hasImage() && !this.isProcessing() && this.stageError() === null,
  );

  /** True once an image is ready and healthy — shows the star-count pill. */
  protected readonly showStarPill = computed(() => this.isStageReady());

  /** True when the before/after compare divider should render. */
  protected readonly showCompareHandle = computed(() => this.isStageReady());

  /** True while the pointer sits on a star — drives the pointer cursor. */
  protected readonly isOverStar = computed(() => this.editor.hoveredStarId() !== null);

  /** Aspect ratio (width / height) the preview frame is laid out at. */
  protected readonly frameAspect = computed(() => {
    const bitmap = this.editor.sourceImage();
    if (bitmap === null || bitmap.height === 0) {
      return 1;
    }
    return bitmap.width / bitmap.height;
  });

  /**
   * Clip applied to the after canvas: everything left of the divider is cut
   * away so the untouched before canvas shows through there, leaving the
   * original on the left and the spiked result on the right.
   *
   * This is deliberately a template binding rather than part of the render
   * effect — dragging the divider updates a clip-path and costs zero spike
   * re-renders.
   *
   * The seam is the raw position, and the divider line uses the same mapping,
   * so the line always sits exactly on the cut and both reach the true edges.
   */
  protected readonly afterClipPath = computed(
    () => `inset(0 0 0 ${this.editor.comparePosition() * 100}%)`,
  );

  /**
   * Effect: on every source-image change, compute the preview scale, resize
   * all three canvas backing stores to the scaled dimensions, and draw the
   * bitmap into the before canvas once.
   */
  private readonly _imageEffect = effect(() => {
    const bitmap = this.editor.sourceImage();
    if (bitmap === null) {
      this.previewScale.set(1);
      this.resizeCanvases(0, 0);
      return;
    }
    // Sprites are keyed by star colour, so a new image's palette would
    // otherwise accumulate on top of the previous one's for the life of the
    // component (each arm sprite is 512x64 RGBA).
    this.spriteCache.clear();
    const scale = Math.min(1, PREVIEW_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    this.resizeCanvases(width, height);
    if (this.basePreviewCanvas === null) {
      this.basePreviewCanvas = document.createElement('canvas');
    }
    this.basePreviewCanvas.width = width;
    this.basePreviewCanvas.height = height;
    const baseCtx = this.basePreviewCanvas.getContext('2d');
    if (baseCtx === null) {
      return;
    }
    baseCtx.drawImage(bitmap, 0, 0, width, height);
    this.viewport.set({ zoom: 1, centerX: bitmap.width / 2, centerY: bitmap.height / 2 });
    this.previewScale.set(scale);
    this.scheduleRender();
  });

  /**
   * Effect: re-render whenever the render params or the preview scale change.
   * Frames are coalesced via `scheduleRender`'s pending-flag pattern. It must
   * never read `comparePosition` — the divider drives clipping only.
   */
  private readonly _renderEffect = effect(() => {
    this.editor.renderParams();
    this.previewScale();
    this.viewport();
    this.scheduleRender();
  });

  /**
   * Effect: repaint the marker overlay whenever the hovered or selected star
   * changes. It touches only the overlay canvas, so hovering and selecting
   * never cost a spike re-render.
   */
  private readonly _markerEffect = effect(() => {
    const hoveredId = this.editor.hoveredStarId();
    const selectedId = this.editor.selectedStarId();
    const stars = this.editor.allStars();
    // Read so the overlay is repainted after a resize cleared its backing
    // store, and after every zoom/pan step so the rings track their stars.
    const scale = this.previewScale();
    this.viewport();
    const byId = (id: number | null) =>
      id === null ? null : (stars.find((s) => s.id === id) ?? null);
    this.drawMarkers(byId(hoveredId), byId(selectedId), scale);
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.frameId !== null) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
    });
  }

  /** Dropzone or stage picked a file — load it as the (new) source image. */
  protected onFileSelected(file: File): void {
    void this.editor.loadImage(file);
  }

  /** Error-banner action — clear the editor back to the empty dropzone. */
  protected onTryAnother(): void {
    this.editor.clearImage();
  }

  /** Drag hovering anywhere over the stage — allow the drop. */
  protected onStageDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  /**
   * Drop anywhere on the stage — loads the file, replacing any current image.
   * The dropzone overlay stops propagation of its own drops, so this fires
   * only for stage-level drops (i.e. while an image is already loaded).
   */
  protected onStageDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files.item(0) ?? null;
    if (file !== null) {
      void this.editor.loadImage(file);
    }
  }

  /**
   * Pointer pressed — start tracking it. Whether this becomes a click (toggle
   * the star under it) or a pan is decided by how far it travels.
   */
  protected onStagePointerDown(event: PointerEvent): void {
    if (!this.editor.hasImage() || this.isProcessing()) {
      return;
    }
    this.dragPointerId = event.pointerId;
    this.dragStarId = this.starAt(event.clientX, event.clientY)?.id ?? null;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragLastX = event.clientX;
    this.dragLastY = event.clientY;
  }

  /**
   * Pointer moved — hover-track the star under it; while pressed and past the
   * drag threshold on a zoomed view, pan the viewport instead.
   */
  protected onStagePointerMove(event: PointerEvent): void {
    if (this.dragPointerId === event.pointerId) {
      const travel = Math.hypot(event.clientX - this.dragStartX, event.clientY - this.dragStartY);

      // A travelling press that started ON a star repositions that star —
      // the manual fix for a detection that missed the core.
      if (this.isMovingStar() || (travel > STAGE_DRAG_THRESHOLD_CSS_PX && this.dragStarId !== null)) {
        if (!this.isMovingStar()) {
          this.isMovingStar.set(true);
          this.markerCanvasRef().nativeElement.setPointerCapture(event.pointerId);
        }
        const point = this.imagePointAt(event.clientX, event.clientY);
        if (point !== null && this.dragStarId !== null) {
          this.editor.moveStar(this.dragStarId, point.x, point.y);
          this.editor.hoveredStarId.set(this.dragStarId);
        }
        return;
      }

      if (this.isPanning() || (travel > STAGE_DRAG_THRESHOLD_CSS_PX && this.viewport().zoom > 1)) {
        if (!this.isPanning()) {
          this.isPanning.set(true);
          this.markerCanvasRef().nativeElement.setPointerCapture(event.pointerId);
          this.editor.hoveredStarId.set(null);
        }
        this.panBy(this.dragLastX - event.clientX, this.dragLastY - event.clientY);
        this.dragLastX = event.clientX;
        this.dragLastY = event.clientY;
        return;
      }
    }
    const star = this.starAt(event.clientX, event.clientY);
    this.editor.hoveredStarId.set(star?.id ?? null);
  }

  /**
   * Pointer released — a press that never became a pan toggles the star under
   * it; a pan just ends.
   */
  protected onStagePointerUp(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) {
      return;
    }
    this.dragPointerId = null;
    this.dragStarId = null;
    const canvas = this.markerCanvasRef().nativeElement;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    if (this.isMovingStar()) {
      this.isMovingStar.set(false);
      return;
    }
    if (this.isPanning()) {
      this.isPanning.set(false);
      return;
    }
    // A press that travelled is a (possibly aborted) drag, never a click — an
    // empty-sky drag that happens to end over a star must not toggle it.
    const travel = Math.hypot(event.clientX - this.dragStartX, event.clientY - this.dragStartY);
    if (travel > STAGE_DRAG_THRESHOLD_CSS_PX) {
      return;
    }
    const star = this.starAt(event.clientX, event.clientY);
    if (star !== null) {
      // Toggling also selects, so the ring stays on the clicked star.
      this.editor.toggleStar(star.id);
      return;
    }
    // Clicking empty sky is how the user dismisses the selection.
    this.editor.clearStarSelection();
  }

  /** Pointer left the preview — nothing is hovered any more. */
  protected onStagePointerLeave(): void {
    this.editor.hoveredStarId.set(null);
  }

  /** Wheel over the preview — zoom toward the cursor. */
  protected onStageWheel(event: WheelEvent): void {
    if (!this.editor.hasImage() || this.isProcessing()) {
      return;
    }
    event.preventDefault();
    const bitmap = this.editor.sourceImage();
    if (bitmap === null) {
      return;
    }
    const anchor = this.imagePointAt(event.clientX, event.clientY);
    if (anchor === null) {
      return;
    }
    const factor = event.deltaY < 0 ? STAGE_WHEEL_ZOOM_FACTOR : 1 / STAGE_WHEEL_ZOOM_FACTOR;
    this.viewport.set(
      zoomViewportAt(
        this.viewport(),
        anchor.x,
        anchor.y,
        factor,
        bitmap.width,
        bitmap.height,
        STAGE_MIN_ZOOM,
        STAGE_MAX_ZOOM,
      ),
    );
  }

  /** Double click — reset the view to the whole image. */
  protected onStageDoubleClick(): void {
    const bitmap = this.editor.sourceImage();
    if (bitmap === null) {
      return;
    }
    this.viewport.set(
      clampViewport(
        { zoom: 1, centerX: bitmap.width / 2, centerY: bitmap.height / 2 },
        bitmap.width,
        bitmap.height,
        STAGE_MIN_ZOOM,
        STAGE_MAX_ZOOM,
      ),
    );
  }

  /** Pans the viewport by a CSS-pixel delta, converted into image space. */
  private panBy(cssDx: number, cssDy: number): void {
    const bitmap = this.editor.sourceImage();
    if (bitmap === null) {
      return;
    }
    const canvas = this.markerCanvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const cssToImage = canvas.width / rect.width / this.effectiveScale();
    this.viewport.set(
      panViewport(
        this.viewport(),
        cssDx * cssToImage,
        cssDy * cssToImage,
        bitmap.width,
        bitmap.height,
        STAGE_MIN_ZOOM,
        STAGE_MAX_ZOOM,
      ),
    );
  }

  /** Divider moved — store the new compare position for the clip-path wipe. */
  protected onComparePositionChange(position: number): void {
    this.editor.comparePosition.set(position);
  }

  /**
   * Resolves the star under a client position, searching ALL detected stars
   * (not just the rendered ones) so a faint star below the brightness cut can
   * still be force-enabled. Returns null while the stage is not interactive.
   */
  private starAt(clientX: number, clientY: number): DetectedStar | null {
    if (!this.editor.hasImage() || this.isProcessing()) {
      return null;
    }
    const point = this.imagePointAt(clientX, clientY);
    if (point === null) {
      return null;
    }
    const canvas = this.markerCanvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    // The hit radius is on-screen CSS pixels: convert it to canvas pixels
    // through the element's CSS ratio, then to full-resolution image pixels.
    const radius = (HIT_TEST_RADIUS_CSS_PX * canvas.width) / rect.width / this.effectiveScale();
    return findNearestStar(this.editor.allStars(), point.x, point.y, radius);
  }

  /** Scale from full-resolution image pixels to canvas pixels, zoom included. */
  private effectiveScale(): number {
    return this.previewScale() * this.viewport().zoom;
  }

  /**
   * Maps a client position to full-resolution image coordinates through the
   * current viewport, or null while the canvas has no layout.
   */
  private imagePointAt(clientX: number, clientY: number): { x: number; y: number } | null {
    const bitmap = this.editor.sourceImage();
    const canvas = this.markerCanvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (bitmap === null || canvas.width === 0 || rect.width === 0 || rect.height === 0) {
      return null;
    }
    const offset = pointerToImagePoint(
      clientX,
      clientY,
      rect,
      canvas.width,
      canvas.height,
      this.effectiveScale(),
    );
    const origin = viewportOrigin(this.viewport(), bitmap.width, bitmap.height);
    return { x: origin.x + offset.x, y: origin.y + offset.y };
  }

  /** Resizes every canvas backing store, which also clears their contents. */
  private resizeCanvases(width: number, height: number): void {
    for (const ref of [this.beforeCanvasRef(), this.canvasRef(), this.markerCanvasRef()]) {
      ref.nativeElement.width = width;
      ref.nativeElement.height = height;
    }
  }

  /** Schedules one coalesced render frame; no-op if one is already pending. */
  private scheduleRender(): void {
    if (this.frameId !== null) {
      return;
    }
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.renderFrame();
    });
  }

  /**
   * Draws one preview frame: blit the base preview from the before canvas,
   * then render the spikes with the render params rescaled from
   * full-resolution image space to preview space (star coordinates are
   * full-res, so `scale` maps them).
   */
  private renderFrame(): void {
    const before = this.beforeCanvasRef().nativeElement;
    const bitmap = this.editor.sourceImage();
    if (before.width === 0 || before.height === 0 || bitmap === null) {
      return;
    }
    const beforeCtx = before.getContext('2d');
    const ctx = this.canvasRef().nativeElement.getContext('2d');
    if (beforeCtx === null || ctx === null) {
      return;
    }
    const view = this.viewport();
    if (view.zoom === 1 && this.basePreviewCanvas !== null) {
      // Fast path: the fitted view blits the cached preview.
      beforeCtx.drawImage(this.basePreviewCanvas, 0, 0);
    } else {
      // Zoomed: resample the visible region straight from the full-resolution
      // bitmap, so zooming shows true detail instead of preview upscaling.
      const origin = viewportOrigin(view, bitmap.width, bitmap.height);
      beforeCtx.drawImage(
        bitmap,
        origin.x,
        origin.y,
        bitmap.width / view.zoom,
        bitmap.height / view.zoom,
        0,
        0,
        before.width,
        before.height,
      );
    }
    ctx.drawImage(before, 0, 0);
    const params = this.editor.renderParams();
    if (params !== null) {
      const scale = this.effectiveScale();
      const origin = viewportOrigin(view, bitmap.width, bitmap.height);
      renderSpikes(
        ctx,
        {
          ...params,
          scale,
          offsetX: -origin.x * scale,
          offsetY: -origin.y * scale,
        },
        this.spriteCache,
      );
    }
  }

  /**
   * Repaints the marker overlay from scratch. Marker sizes are converted from
   * CSS pixels to canvas pixels so they stay a constant on-screen size however
   * far the preview is downscaled.
   */
  private drawMarkers(
    hoveredStar: DetectedStar | null,
    selectedStar: DetectedStar | null,
    scale: number,
  ): void {
    const canvas = this.markerCanvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (canvas.width === 0) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const cssToCanvas = rect.width === 0 ? 1 : canvas.width / rect.width;
    this.resolveMarkerColors();
    const bitmap = this.editor.sourceImage();
    const view = this.viewport();
    const effectiveScale = scale * view.zoom;
    const origin =
      bitmap === null ? { x: 0, y: 0 } : viewportOrigin(view, bitmap.width, bitmap.height);
    drawStarMarkers(ctx, {
      hoveredStar,
      selectedStar,
      scale: effectiveScale,
      offsetX: -origin.x * effectiveScale,
      offsetY: -origin.y * effectiveScale,
      hoverRadiusPx: HOVER_MARKER_RADIUS_CSS_PX * cssToCanvas,
      selectedRadiusPx: SELECTED_MARKER_RADIUS_CSS_PX * cssToCanvas,
      lineWidthPx: MARKER_LINE_WIDTH_CSS_PX * cssToCanvas,
      hoverColor: this.hoverMarkerColor,
      selectedColor: this.selectedMarkerColor,
    });
  }

  /**
   * Reads the marker colors from the host's computed style so the overlay
   * stays theme-driven and the marker renderer stays DOM-free. Retries until
   * both custom properties resolve, then caches them.
   */
  private resolveMarkerColors(): void {
    if (this.hasMarkerColors) {
      return;
    }
    const styles = getComputedStyle(this.host.nativeElement);
    this.hoverMarkerColor = styles.getPropertyValue('--as-marker-hover-color').trim();
    this.selectedMarkerColor = styles.getPropertyValue('--as-marker-selected-color').trim();
    this.hasMarkerColors = this.hoverMarkerColor !== '' && this.selectedMarkerColor !== '';
  }
}
