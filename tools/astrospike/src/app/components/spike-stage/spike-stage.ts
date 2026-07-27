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
} from '../../constants/render.constants';
import {
  DISABLED_MARKER_DASH_CSS_PX,
  DISABLED_MARKER_RADIUS_CSS_PX,
  HOVER_MARKER_RADIUS_CSS_PX,
  MARKER_LINE_WIDTH_CSS_PX,
} from '../../constants/star-marker.constants';
import { DetectedStar } from '../../models/detected-star.model';
import { SpriteCache } from '../../models/spike-render-params.model';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { pointerToImagePoint } from '../../utils/canvas-coords.util';
import { selectDisabledStars } from '../../utils/disabled-stars.util';
import { findNearestStar } from '../../utils/hit-test.util';
import { renderSpikes } from '../../utils/spike-render.util';
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

  /** Pending requestAnimationFrame id, or null when no frame is scheduled. */
  private frameId: number | null = null;

  /** Resolved CSS color of the hover ring, or '' before it is read. */
  private hoverMarkerColor = '';

  /** Resolved CSS color of the disabled-star rings, or '' before it is read. */
  private disabledMarkerColor = '';

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
    const scale = Math.min(1, PREVIEW_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    this.resizeCanvases(width, height);
    const baseCtx = this.beforeCanvasRef().nativeElement.getContext('2d');
    if (baseCtx === null) {
      return;
    }
    baseCtx.drawImage(bitmap, 0, 0, width, height);
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
    this.scheduleRender();
  });

  /**
   * Effect: repaint the marker overlay whenever the hovered star or the set of
   * manually disabled stars changes. It touches only the overlay canvas, so
   * hovering never costs a spike re-render.
   */
  private readonly _markerEffect = effect(() => {
    const hoveredId = this.editor.hoveredStarId();
    const stars = this.editor.allStars();
    const disabledStars = selectDisabledStars(
      stars,
      this.editor.visibleStarCount(),
      this.editor.renderedStars(),
    );
    // Read so the overlay is repainted after a resize cleared its backing store.
    const scale = this.previewScale();
    const hoveredStar = hoveredId === null ? null : (stars.find((s) => s.id === hoveredId) ?? null);
    this.drawMarkers(hoveredStar, disabledStars, scale);
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

  /** Pointer moved over the preview — track the star under it, if any. */
  protected onStagePointerMove(event: PointerEvent): void {
    const star = this.starAt(event.clientX, event.clientY);
    this.editor.hoveredStarId.set(star?.id ?? null);
  }

  /** Pointer left the preview — nothing is hovered any more. */
  protected onStagePointerLeave(): void {
    this.editor.hoveredStarId.set(null);
  }

  /** Click on the preview — toggle spikes on the star under the pointer. */
  protected onStageClick(event: MouseEvent): void {
    const star = this.starAt(event.clientX, event.clientY);
    if (star !== null) {
      this.editor.toggleStar(star.id);
    }
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
    const canvas = this.markerCanvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width === 0 || rect.width === 0 || rect.height === 0) {
      return null;
    }
    const scale = this.previewScale();
    const point = pointerToImagePoint(
      clientX,
      clientY,
      rect,
      canvas.width,
      canvas.height,
      scale,
    );
    // The hit radius is on-screen CSS pixels: convert it to canvas pixels
    // through the element's CSS ratio, then to full-resolution image pixels.
    const radius = (HIT_TEST_RADIUS_CSS_PX * canvas.width) / rect.width / scale;
    return findNearestStar(this.editor.allStars(), point.x, point.y, radius);
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
    const base = this.beforeCanvasRef().nativeElement;
    if (base.width === 0 || base.height === 0) {
      return;
    }
    const ctx = this.canvasRef().nativeElement.getContext('2d');
    if (ctx === null) {
      return;
    }
    ctx.drawImage(base, 0, 0);
    const params = this.editor.renderParams();
    if (params !== null) {
      renderSpikes(ctx, { ...params, scale: this.previewScale() }, this.spriteCache);
    }
  }

  /**
   * Repaints the marker overlay from scratch. Marker sizes are converted from
   * CSS pixels to canvas pixels so they stay a constant on-screen size however
   * far the preview is downscaled.
   */
  private drawMarkers(
    hoveredStar: DetectedStar | null,
    disabledStars: readonly DetectedStar[],
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
    drawStarMarkers(ctx, {
      hoveredStar,
      disabledStars,
      scale,
      hoverRadiusPx: HOVER_MARKER_RADIUS_CSS_PX * cssToCanvas,
      disabledRadiusPx: DISABLED_MARKER_RADIUS_CSS_PX * cssToCanvas,
      lineWidthPx: MARKER_LINE_WIDTH_CSS_PX * cssToCanvas,
      disabledDashPx: DISABLED_MARKER_DASH_CSS_PX.map((dash) => dash * cssToCanvas),
      hoverColor: this.hoverMarkerColor,
      disabledColor: this.disabledMarkerColor,
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
    this.disabledMarkerColor = styles.getPropertyValue('--as-marker-disabled-color').trim();
    this.hasMarkerColors = this.hoverMarkerColor !== '' && this.disabledMarkerColor !== '';
  }
}
