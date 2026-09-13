import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  DIRECTION_VECTORS,
  GALAXY_PAN_FACTOR,
  MIN_SCALE,
} from '../../constants/simulation.constant';
import {
  CORE_TINT_FACTOR,
  STAR_COLORS,
  STAR_SPRITE_SIZE,
  WHITE_STAR_INDEX,
} from '../../constants/star-appearance.constant';
import { RgbColor, StarSprites } from '../../models/star-appearance.model';
import { SimulationService } from '../../services/simulation.service';
import { colorMixForIntensity, mixRgb, tintForIntensity } from '../../utils/star-appearance.util';
import { ClearImageButton } from './clear-image-button/clear-image-button';
import { HudOverlay } from './hud-overlay/hud-overlay';
import { ImageUploadOverlay } from './image-upload-overlay/image-upload-overlay';
import { LoadingOverlay } from './loading-overlay/loading-overlay';

const TARGET_SCALE = 2.5;
const SHOOTING_STAR_SPAWN_RATE = 1.5;

/**
 * @class Simulator
 * @description
 * Main simulation component responsible for rendering a dynamic starfield with a galaxy background.
 * Delegates state management to SimulationService and focuses on canvas rendering.
 */
@Component({
  selector: 'dba-sw-simulator',
  templateUrl: './simulator.html',
  styleUrl: './simulator.css',
  standalone: true,
  imports: [HudOverlay, LoadingOverlay, ImageUploadOverlay, ClearImageButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--aspect-ratio]': 'aspectRatioStyle()',
    '[style.--aspect-ratio-num]': 'aspectRatioNum()',
    '[style.--format-width]': 'formatWidthStyle()',
  },
})
export class Simulator implements AfterViewInit {
  /** @private Canvas template reference — available after view init. */
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('starCanvas');

  /** Shared simulation state + recording state machine. */
  protected readonly simService = inject(SimulationService);

  /** @private Cleanup hook for the window resize listener. */
  private readonly _destroyRef = inject(DestroyRef);

  /** CSS custom property value for the host's aspect-ratio. */
  protected readonly aspectRatioStyle = computed(() => {
    const dims = this.simService.canvasDimensions();
    return `${dims.width} / ${dims.height}`;
  });

  /**
   * Numeric (width / height) aspect ratio, e.g. `0.5625` for 9:16. Used by
   * CSS `min()` math to derive a width that respects a height cap while
   * keeping the aspect ratio intact (CSS `aspect-ratio` won't shrink an
   * explicit width when `max-height` clips, so we feed the ratio in
   * directly via this var).
   */
  protected readonly aspectRatioNum = computed(() => {
    const dims = this.simService.canvasDimensions();
    return `${dims.width / dims.height}`;
  });

  /**
   * Format width (in CSS px) — the user-selected export width. Used as
   * one of the upper bounds when sizing the on-screen preview; the
   * export itself always uses the full pixel dimensions regardless of
   * how large the preview renders.
   */
  protected readonly formatWidthStyle = computed(() => {
    const dims = this.simService.canvasDimensions();
    return `${dims.width}px`;
  });

  // Rendering State
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private centerX = 0;
  private centerY = 0;
  private currentScale = 1.0;
  private currentRotation = 0;
  private panX = 0;
  private panY = 0;
  private starSprites: StarSprites | null = null;
  /** Twinkle clock captured at the freeze instant, so a held frame is fully static. */
  private frozenTimeSeconds: number | null = null;
  private lastShootingStarSpawn = 0;
  private animationFrameId: number | null = null;

  // Custom Path playback / authoring state
  /** Timestamp (ms) the current A→B leg started, for constant-speed progress. */
  private pathLegStart = 0;
  /** Whether the current loop leg is travelling B→A (ping-pong). */
  private pathReversed = false;
  /** Tracks the playing flag across frames so we can detect a fresh start. */
  private wasPlaying = false;
  /** True while the user is dragging the preview to pan (path mode). */
  protected readonly isDragging = signal(false);
  /** Last pointer position (client px) during a pan drag. */
  private lastPointerX = 0;
  private lastPointerY = 0;
  /**
   * Active pointers on the preview, keyed by pointerId (client px). Drives the
   * single-finger pan vs. two-finger pinch-zoom split on touch devices, where
   * there is no wheel event to zoom with.
   */
  private readonly activePointers = new Map<number, { x: number; y: number }>();
  /** Finger spread (client px) captured when a two-finger pinch began. */
  private pinchStartDistance = 0;
  /** Live-camera scale captured when a two-finger pinch began. */
  private pinchStartScale = 1;

  /** Effect: start/stop MediaRecorder in response to recording state changes. */
  private readonly _recordingEffect = effect(() => {
    const state = this.simService.recordingState();
    if (state === 'recording' && !this.simService.isRecording()) {
      this.simService.startRecording(this.canvasRef().nativeElement);
    } else if (state === 'idle' && this.simService.isRecording()) {
      this.simService.stopRecording();
    }
  });

  /** Effect: reset animation to frame 0 before a record-from-beginning session. */
  private readonly _resetAndRecordEffect = effect(() => {
    const shouldResetAndRecord = this.simService.resetAndRecordRequested();
    if (shouldResetAndRecord) {
      this.currentScale = this.depthStartScale();
      this.currentRotation = 0;
      this.panX = 0;
      this.panY = 0;
      // In path mode, restart the glide from A so the recording captures a clean A→B.
      if (this.simService.isPathMode() && this.simService.canPlayPath()) {
        this.pathReversed = false;
        this.pathLegStart = performance.now();
        this.simService.playPath();
      }
      this.simService.resetAndRecordRequested.set(false);
      requestAnimationFrame(() => {
        this.renderFrame();
        this.simService.recordingState.set('recording');
      });
    }
  });

  /** Effect: reset animation position without entering a recording session. */
  private readonly _restartEffect = effect(() => {
    const shouldRestart = this.simService.restartAnimationRequested();
    if (shouldRestart) {
      // A restart always releases a held frame (loop-off clip end or freeze).
      this.simService.sceneFrozen.set(false);
      if (this.simService.isPathMode() && this.simService.pathFinalized()) {
        // Restart the fixed path from A (keeps looping).
        this.pathReversed = false;
        this.pathLegStart = performance.now();
        this.simService.playPath();
      } else {
        this.currentScale = this.depthStartScale();
        this.currentRotation = 0;
        this.panX = 0;
        this.panY = 0;
      }
      this.simService.restartAnimationRequested.set(false);
      // Every restart plays the clip timeline as a recording would, so the
      // user can preview freeze/duration/loop behaviour without recording.
      this.simService.startClipPreview();
    }
  });

  /** Effect: rebuild canvas dimensions when the format selection changes. */
  private readonly _dimensionsEffect = effect(() => {
    const dims = this.simService.canvasDimensions();
    if (this.ctx) {
      this.setupCanvasDimensions(dims);
      this.resetSimulation();
    }
  });

  /** Effect: grow/shrink the star field live when the star-count control changes. */
  private readonly _starCountEffect = effect(() => {
    this.simService.controls.starCount();
    if (this.ctx) {
      this.simService.adjustStarCount(this.width, this.height);
    }
  });

  /** Effect: re-render the tinted star sprites live when Star Color Intensity changes. */
  private readonly _starAppearanceEffect = effect(() => {
    this.simService.controls.starColorIntensity();
    if (this.ctx) {
      this.generateStarSprites();
    }
  });

  /**
   * Effect: re-roll every star's colour when Colorful Stars changes. Colours
   * are otherwise fixed at spawn, so without this the slider would only
   * affect newly created stars. The star list itself is read untracked —
   * spawning stars must not re-trigger a field-wide re-roll.
   */
  private readonly _colorRatioEffect = effect(() => {
    this.simService.controls.colorfulStarRatio();
    untracked(() => {
      for (const star of this.simService.stars()) {
        star.rerollColor();
      }
    });
  });

  /**
   * Effect: when the travel direction changes to a depth preset, initialise the
   * zoom to that leg's starting scale so Backward begins zoomed (and zooms out)
   * rather than snapping to max zoom on the first frame. Lateral presets and
   * Custom Path manage their own zoom, so they're left untouched.
   */
  private readonly _directionEffect = effect(() => {
    const dir = this.simService.travelDirection();
    if (dir === 'forward' || dir === 'backward') {
      this.currentScale = dir === 'backward' ? TARGET_SCALE : MIN_SCALE;
    }
  });

  /** Effect: clear every in-flight streak the instant shooting stars are disabled. */
  private readonly _shootingStarsToggleEffect = effect(() => {
    if (!this.simService.shootingStarsEnabled()) {
      for (const star of this.simService.shootingStars()) {
        star.deactivate();
      }
    }
  });

  ngAfterViewInit() {
    this.init();
  }

  handleImageUpload(event: Event) {
    this.simService.handleImageUpload(event);
    this.lastShootingStarSpawn = Date.now();
  }

  clearImage() {
    this.simService.clearImage();
    this.currentScale = 1.0;
    this.currentRotation = 0;
    this.panX = 0;
    this.panY = 0;
  }

  private init() {
    this.ctx = this.canvasRef().nativeElement.getContext('2d');
    this.setupCanvasDimensions();
    this.generateStarSprites();
    this.simService.loadingProgress.set('Initializing...');

    this.simService.loadDefaultScene();

    setTimeout(() => {
      this.simService.loadStarsAsync(this.width, this.height, () => {
        // Stars are done — but only reach 'Ready' once the default scene image
        // has also settled, so the loading overlay never clears into a blank,
        // control-less preview while the image is still fetching.
        this.simService.markStarsReady();
        this.lastShootingStarSpawn = Date.now();
      });
    }, 10);

    this.animate();

    const onResize = () => this.setupCanvasDimensions();
    window.addEventListener('resize', onResize);
    this._destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
  }

  private setupCanvasDimensions = (overrideDims?: { width: number; height: number }) => {
    const canvas = this.canvasRef().nativeElement;
    const dims = overrideDims || this.simService.canvasDimensions();
    canvas.width = dims.width;
    canvas.height = dims.height;
    this.width = dims.width;
    this.height = dims.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
  };

  private resetSimulation() {
    this.currentScale = this.depthStartScale();
    this.currentRotation = 0;
    this.panX = 0;
    this.panY = 0;
    this.simService.resetStars();
    this.simService.loadingProgress.set('Re-initializing...');

    this.simService.loadStarsAsync(this.width, this.height, () => {
      this.simService.loadingProgress.set('Ready');
    });
  }

  /**
   * Pre-renders one glow sprite and one diffraction-spike sprite per palette
   * colour so per-frame star drawing stays a cheap drawImage call. Tints are
   * resolved against the Star Color Intensity control, so this re-runs when
   * that slider moves (see `_starAppearanceEffect`).
   */
  private generateStarSprites() {
    const intensity = this.simService.controls.starColorIntensity();
    const glow: HTMLCanvasElement[] = [];
    const spikes: HTMLCanvasElement[] = [];
    for (const color of STAR_COLORS) {
      const tint = tintForIntensity(color, intensity);
      // Tint part of the hot core too — small stars show mostly core, so a
      // pure-white core would leave the whole field reading as white.
      const coreMix = CORE_TINT_FACTOR * Math.min(1, colorMixForIntensity(intensity));
      const coreTint = mixRgb({ r: 255, g: 255, b: 255 }, tint, coreMix);
      const glowSprite = this.renderGlowSprite(tint, coreTint);
      const spikeSprite = this.renderSpikeSprite(tint);
      if (!glowSprite || !spikeSprite) return;
      glow.push(glowSprite);
      spikes.push(spikeSprite);
    }
    this.starSprites = { glow, spikes };
  }

  /**
   * Renders a soft radial glow with a lightly tinted core fading through the
   * full tint — same falloff shape as the original white-only texture.
   */
  private renderGlowSprite(tint: RgbColor, coreTint: RgbColor): HTMLCanvasElement | null {
    const size = STAR_SPRITE_SIZE;
    const half = size / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const halo = `${tint.r}, ${tint.g}, ${tint.b}`;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, `rgba(${coreTint.r}, ${coreTint.g}, ${coreTint.b}, 1)`);
    gradient.addColorStop(0.2, `rgba(${halo}, 1)`);
    gradient.addColorStop(0.4, `rgba(${halo}, 0.6)`);
    gradient.addColorStop(0.7, `rgba(${halo}, 0.2)`);
    gradient.addColorStop(1, `rgba(${halo}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  /**
   * Renders a four-point diffraction spike: two thin perpendicular strokes
   * that fade out toward the tips, tinted to match the star's glow.
   */
  private renderSpikeSprite(tint: RgbColor): HTMLCanvasElement | null {
    const size = STAR_SPRITE_SIZE;
    const half = size / 2;
    const armWidth = size * 0.02;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const arm = `${tint.r}, ${tint.g}, ${tint.b}`;
    const horizontal = ctx.createLinearGradient(0, 0, size, 0);
    horizontal.addColorStop(0, `rgba(${arm}, 0)`);
    horizontal.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    horizontal.addColorStop(1, `rgba(${arm}, 0)`);
    ctx.fillStyle = horizontal;
    ctx.fillRect(0, half - armWidth / 2, size, armWidth);

    const vertical = ctx.createLinearGradient(0, 0, 0, size);
    vertical.addColorStop(0, `rgba(${arm}, 0)`);
    vertical.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    vertical.addColorStop(1, `rgba(${arm}, 0)`);
    ctx.fillStyle = vertical;
    ctx.fillRect(half - armWidth / 2, 0, armWidth, size);
    return canvas;
  }

  private animate = () => {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.ctx) return;

    // A frozen scene keeps rendering (an active recording must keep capturing
    // the held frame) but skips every motion update.
    if (this.simService.isImageLoaded() && !this.simService.sceneFrozen()) {
      this.updateGlobalState();
      this.handleShootingStarSpawning();
    }

    this.renderFrame();
  };

  /**
   * Starting zoom for a depth preset: Backward begins zoomed in (then zooms
   * out to wide), Forward begins wide (then zooms in) — so Backward is the
   * exact mirror of Forward and never snaps to max zoom on entry.
   */
  private depthStartScale(): number {
    return this.simService.travelDirection() === 'backward' ? TARGET_SCALE : MIN_SCALE;
  }

  private updateGlobalState() {
    if (this.simService.isPathMode()) {
      this.updatePathState();
      return;
    }

    const dir = DIRECTION_VECTORS[this.simService.travelDirection()];
    const zoomStep = this.simService.getInternalValue('zoomRate');

    if (dir.z < 0) {
      // Forward — spin the vortex and zoom into the object, wrapping to MIN_SCALE.
      this.currentRotation += this.simService.getInternalValue('rotationRate');
      if (this.currentScale < TARGET_SCALE) {
        this.currentScale += zoomStep;
      } else {
        this.currentScale = MIN_SCALE;
      }
    } else if (dir.z > 0) {
      // Backward — spin the vortex and zoom out (recede), wrapping to TARGET_SCALE.
      this.currentRotation += this.simService.getInternalValue('rotationRate');
      if (this.currentScale > MIN_SCALE) {
        this.currentScale -= zoomStep;
      } else {
        this.currentScale = TARGET_SCALE;
      }
    } else {
      // Lateral travel — the vortex rotation no longer makes sense, so flatten
      // it to 0 for a straight sideways glide. Zoom is held at its current value.
      this.currentRotation = 0;
    }

    // Pan the galaxy backdrop (the slowest parallax layer) with the lateral
    // component, tied to starSpeed so the DSO and stars stay proportional, then
    // clamp to the overscan so no uncovered edge is exposed.
    const lateralSpeed = this.simService.getInternalValue('starSpeed');
    this.panX += dir.x * lateralSpeed * GALAXY_PAN_FACTOR;
    this.panY += dir.y * lateralSpeed * GALAXY_PAN_FACTOR;
    this.clampGalaxyPan();
  }

  /**
   * Clamps panX/panY so the panned galaxy never exposes an uncovered edge.
   * Overscan is measured in post-scale world space (the space the galaxy is
   * drawn in), so the available pan shrinks as the zoom grows.
   */
  private clampGalaxyPan() {
    const galaxyImage = this.simService.galaxyImage();
    if (!galaxyImage || galaxyImage.naturalWidth === 0) {
      return;
    }

    const scaleFactor = Math.max(
      this.width / galaxyImage.naturalWidth,
      this.height / galaxyImage.naturalHeight,
    );
    const drawWidth = galaxyImage.naturalWidth * scaleFactor;
    const drawHeight = galaxyImage.naturalHeight * scaleFactor;

    const limitX = Math.max(0, drawWidth / 2 - this.width / 2 / this.currentScale);
    const limitY = Math.max(0, drawHeight / 2 - this.height / 2 / this.currentScale);

    this.panX = Math.max(-limitX, Math.min(limitX, this.panX));
    this.panY = Math.max(-limitY, Math.min(limitY, this.panY));
  }

  /**
   * Custom Path frame update: advances the A→B glide when playing (or applies a
   * gentle idle drift while framing), then syncs the render transform from the
   * live camera. Rotation is always flat in path mode.
   */
  private updatePathState() {
    this.currentRotation = 0;

    const playing = this.simService.pathPlaying();
    if (playing && !this.wasPlaying) {
      // Playback just began — start the A→B timer on this exact frame so the
      // first elapsed reading is ~0 (otherwise the glide snaps straight to B).
      this.pathLegStart = performance.now();
      this.pathReversed = false;
    }
    this.wasPlaying = playing;

    if (playing) {
      this.advancePath();
    }

    // Stars are self-driven from the Star Direction / Depth / Speed controls
    // (see Star.update), so the path only manages the camera here.

    const cam = this.simService.liveCamera();
    this.currentScale = cam.scale;
    this.panX = cam.panX;
    this.panY = cam.panY;
    this.clampGalaxyPan();
  }

  /**
   * Advances the live camera one frame from A toward B at the user's constant
   * speed, then loops by restarting from A (A→B again), not a reverse pass.
   */
  private advancePath() {
    const start = this.simService.cameraStart();
    const end = this.simService.cameraEnd();
    if (!start || !end) {
      this.simService.stopPath();
      return;
    }

    const duration = Math.max(0.001, this.simService.pathDurationSeconds());
    const elapsed = (performance.now() - this.pathLegStart) / 1000;
    const t = Math.min(1, elapsed / duration);

    this.simService.setLiveCamera({
      panX: start.panX + (end.panX - start.panX) * t,
      panY: start.panY + (end.panY - start.panY) * t,
      scale: start.scale + (end.scale - start.scale) * t,
    });

    if (t >= 1) {
      // We've reached B this frame (lerp at t=1 == end).
      if (this.simService.isRecording() || this.simService.previewActive()) {
        // The clip (or its preview) ends with the pass — the service applies
        // the optional end-of-path hold and the Loop setting.
        this.simService.onPathPassComplete();
      } else if (this.simService.loopEnabled()) {
        // Restart the timer so the next frame begins a fresh A→B leg —
        // looping from the beginning without skipping B (don't overwrite to A
        // here, or B would never render).
        this.pathLegStart = performance.now();
      } else {
        // Loop off: hold the final framing until Restart / Loop re-enable.
        this.simService.stopPath();
        this.simService.sceneFrozen.set(true);
      }
    }
  }


  /**
   * Pointer down on the preview — begin a pan drag with one finger, or switch to
   * a pinch-zoom once a second finger lands (path mode, while authoring).
   */
  protected onCanvasPointerDown(event: PointerEvent) {
    if (!this.simService.isPathMode() || this.simService.pathFinalized()) {
      return;
    }
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.activePointers.size >= 2) {
      // Second finger down — stop panning and start a pinch-zoom.
      this.isDragging.set(false);
      this.beginPinch();
      return;
    }

    this.isDragging.set(true);
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
  }

  /**
   * Pointer move — pinch-zoom the live camera with two fingers, otherwise pan it
   * by the drag delta in world units.
   */
  protected onCanvasPointerMove(event: PointerEvent) {
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (this.activePointers.size >= 2) {
      this.applyPinchZoom();
      return;
    }

    if (!this.isDragging()) {
      return;
    }
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const dxCanvas = ((event.clientX - this.lastPointerX) * canvas.width) / rect.width;
    const dyCanvas = ((event.clientY - this.lastPointerY) * canvas.height) / rect.height;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;

    const cam = this.simService.liveCamera();
    this.simService.updateLiveCamera({
      panX: cam.panX + dxCanvas / cam.scale,
      panY: cam.panY + dyCanvas / cam.scale,
    });
  }

  /**
   * Pointer up / leave / cancel — drop the lifted finger and resume the
   * appropriate gesture: keep panning if one finger remains (a pinch that lost a
   * finger), or go idle once none are left.
   */
  protected onCanvasPointerUp(event?: PointerEvent) {
    if (event) {
      this.activePointers.delete(event.pointerId);
    } else {
      this.activePointers.clear();
    }

    if (this.activePointers.size < 2) {
      // No longer a two-finger gesture — forget the pinch baseline.
      this.pinchStartDistance = 0;
    }

    if (this.activePointers.size === 1) {
      // One finger left after a pinch — resume panning from its current spot so
      // the camera doesn't jump on the next move.
      const [remaining] = this.activePointers.values();
      this.lastPointerX = remaining.x;
      this.lastPointerY = remaining.y;
      this.isDragging.set(true);
    } else if (this.activePointers.size === 0) {
      this.isDragging.set(false);
    }
  }

  /** Wheel over the preview — zoom the live camera (path mode, not playing). */
  protected onCanvasWheel(event: WheelEvent) {
    if (!this.simService.isPathMode() || this.simService.pathFinalized()) {
      return;
    }
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.simService.updateLiveCamera({ scale: this.simService.liveCamera().scale * factor });
  }

  /** Capture the finger spread and camera scale at the start of a pinch. */
  private beginPinch() {
    this.pinchStartDistance = this.currentPointerDistance();
    this.pinchStartScale = this.simService.liveCamera().scale;
  }

  /**
   * Scale the live camera by the change in finger spread since the pinch began.
   * The service clamps the result to the same bounds as wheel zoom, and — like
   * wheel zoom — the scale is applied about the preview centre.
   */
  private applyPinchZoom() {
    const distance = this.currentPointerDistance();
    if (this.pinchStartDistance === 0 || distance === 0) {
      return;
    }
    const factor = distance / this.pinchStartDistance;
    this.simService.updateLiveCamera({ scale: this.pinchStartScale * factor });
  }

  /** Euclidean distance (client px) between the first two active pointers. */
  private currentPointerDistance(): number {
    const [a, b] = this.activePointers.values();
    if (!a || !b) {
      return 0;
    }
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  private handleShootingStarSpawning() {
    // Whole starfield removed by the user — never spawn.
    if (!this.simService.starsEnabled()) {
      return;
    }

    // Disabled by the user — never spawn.
    if (!this.simService.shootingStarsEnabled()) {
      return;
    }

    // Shooting stars follow the current star motion; none when there's no motion.
    if (!this.simService.hasStarMotion()) {
      return;
    }

    const now = Date.now();
    const timeSinceLastSpawn = (now - this.lastShootingStarSpawn) / 1000;

    if (timeSinceLastSpawn > 1 / SHOOTING_STAR_SPAWN_RATE) {
      for (const star of this.simService.shootingStars()) {
        if (!star.isActive) {
          star.spawn();
          this.lastShootingStarSpawn = now;
          break;
        }
      }
    }
  }

  private renderFrame() {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.save();
    this.applyViewTransformations();
    this.drawGalaxyBackground();
    this.drawStars();
    this.ctx.restore();
  }

  private applyViewTransformations() {
    if (!this.ctx) return;
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.currentRotation);
    this.ctx.scale(this.currentScale, this.currentScale);
  }

  private drawGalaxyBackground() {
    const galaxyImage = this.simService.galaxyImage();
    if (!this.ctx || !galaxyImage || !galaxyImage.complete || galaxyImage.naturalWidth === 0) {
      return;
    }

    const scaleFactor = Math.max(
      this.width / galaxyImage.naturalWidth,
      this.height / galaxyImage.naturalHeight,
    );
    const drawWidth = galaxyImage.naturalWidth * scaleFactor;
    const drawHeight = galaxyImage.naturalHeight * scaleFactor;

    // panX/panY shift the backdrop for lateral travel; stars carry their own
    // parallax via their x/y, so the pan is applied to the galaxy only.
    this.ctx.drawImage(
      galaxyImage,
      -drawWidth / 2 + this.panX,
      -drawHeight / 2 + this.panY,
      drawWidth,
      drawHeight,
    );
  }

  private drawStars() {
    if (!this.ctx || !this.simService.isImageLoaded()) return;

    // Master switch off — record the galaxy backdrop alone, no background stars
    // and no shooting stars (drawGalaxyBackground still runs, so it keeps moving).
    if (!this.simService.starsEnabled()) return;

    // While composing a Custom Path (before "Set Path"), hide the whole field so
    // the user frames against a clean backdrop. The stars appear and start moving
    // once the path is fixed (finalizePath derives the star motion).
    if (this.simService.isPathMode() && !this.simService.pathFinalized()) return;

    // A frozen scene renders a fully static frame: star positions stop
    // updating and the twinkle clock holds at the freeze instant.
    const isFrozen = this.simService.sceneFrozen();
    const isMoving = this.simService.isImageLoaded() && !isFrozen;
    if (isFrozen) {
      this.frozenTimeSeconds ??= performance.now() / 1000;
    } else {
      this.frozenTimeSeconds = null;
    }
    const timeSeconds = this.frozenTimeSeconds ?? performance.now() / 1000;

    for (const star of this.simService.stars()) {
      if (isMoving) star.update();
      star.draw(this.ctx, this.width, this.currentScale, this.starSprites, timeSeconds);
    }

    if (this.simService.shootingStarsEnabled()) {
      // Shooting stars deliberately stay white for contrast against the
      // tinted background field.
      const whiteGlow = this.starSprites?.glow[WHITE_STAR_INDEX] ?? null;
      for (const star of this.simService.shootingStars()) {
        if (isMoving) star.update();
        star.draw(this.ctx, this.width, this.currentScale, whiteGlow);
      }
    }
  }
}
