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
import { PREVIEW_MAX_DIMENSION } from '../../constants/render.constants';
import { SpriteCache } from '../../models/spike-render-params.model';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { renderSpikes } from '../../utils/spike-render.util';
import { ImageDropzone } from '../image-dropzone/image-dropzone';

/**
 * Preview stage — owns the render pipeline from the loaded source image to
 * the visible "after" canvas. The full-resolution bitmap is drawn once into
 * an offscreen base-preview canvas at preview scale; every render frame then
 * blits that base and draws spikes on top via `renderSpikes`, coalesced
 * through `requestAnimationFrame` so rapid control changes cost one frame.
 *
 * Also hosts the stage overlays: the image dropzone when empty, the
 * constellation loader while loading/detecting, the error banner, and the
 * "N stars detected" pill. Dropping a file anywhere on the stage (even with
 * an image already loaded) loads it as the new source image.
 *
 * M2 adds the before-canvas, compare divider, and hover markers on top of
 * the same base-canvas structure.
 */
@Component({
  selector: 'dba-as-spike-stage',
  standalone: true,
  imports: [ConstellationLoaderComponent, ImageDropzone, PillBadgeComponent, TextButtonComponent],
  templateUrl: './spike-stage.html',
  styleUrl: './spike-stage.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpikeStage {
  /** Shared editor state — image, detection, controls, and render params. */
  protected readonly editor = inject(SpikeEditorService);

  /** Visible "after" canvas the composited preview is drawn onto. */
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('afterCanvas');

  /**
   * Offscreen base-preview canvas: the source image scaled to preview size,
   * drawn exactly once per load and blitted at the start of every frame.
   */
  private readonly baseCanvas: HTMLCanvasElement = document.createElement('canvas');

  /** Sprite cache shared across render frames (keyed by color/gamma). */
  private readonly spriteCache: SpriteCache = new Map();

  /** Scale from full-resolution image pixels to preview canvas pixels. */
  private readonly previewScale = signal(1);

  /** Pending requestAnimationFrame id, or null when no frame is scheduled. */
  private frameId: number | null = null;

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

  /** True once an image is ready and healthy — shows the star-count pill. */
  protected readonly showStarPill = computed(
    () => this.editor.hasImage() && !this.isProcessing() && this.stageError() === null,
  );

  /**
   * Effect: on every source-image change, compute the preview scale, resize
   * the visible + base canvas backing stores to the scaled dimensions, and
   * draw the bitmap into the base canvas once.
   */
  private readonly _imageEffect = effect(() => {
    const bitmap = this.editor.sourceImage();
    if (bitmap === null) {
      this.previewScale.set(1);
      this.baseCanvas.width = 0;
      this.baseCanvas.height = 0;
      return;
    }
    const scale = Math.min(1, PREVIEW_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    this.baseCanvas.width = width;
    this.baseCanvas.height = height;
    const baseCtx = this.baseCanvas.getContext('2d');
    if (baseCtx === null) {
      return;
    }
    baseCtx.drawImage(bitmap, 0, 0, width, height);
    const canvas = this.canvasRef().nativeElement;
    canvas.width = width;
    canvas.height = height;
    this.previewScale.set(scale);
    this.scheduleRender();
  });

  /**
   * Effect: re-render whenever the render params or the preview scale change.
   * Frames are coalesced via `scheduleRender`'s pending-flag pattern.
   */
  private readonly _renderEffect = effect(() => {
    this.editor.renderParams();
    this.previewScale();
    this.scheduleRender();
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
   * Draws one preview frame: blit the cached base preview, then render the
   * spikes with the render params rescaled from full-resolution image space
   * to preview space (star coordinates are full-res, so `scale` maps them).
   */
  private renderFrame(): void {
    if (this.baseCanvas.width === 0 || this.baseCanvas.height === 0) {
      return;
    }
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      return;
    }
    ctx.drawImage(this.baseCanvas, 0, 0);
    const params = this.editor.renderParams();
    if (params !== null) {
      renderSpikes(ctx, { ...params, scale: this.previewScale() }, this.spriteCache);
    }
  }
}
