import { computed, inject, Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import {
  ASSUMED_FPS,
  CONTROLS,
  DEFAULT_FORMAT,
  DEFAULT_GALAXY_URL,
  DIRECTION_STAR_DEFAULTS,
  FORMATS,
  FormatKey,
  MAX_ZOOM,
  MIN_SCALE,
  PATH_DURATION_MAX,
  PATH_DURATION_MIN,
  PATH_SCALE_DISTANCE_WEIGHT,
  PATH_SPEED_DEFAULT,
  PATH_STAR_SPEED_FACTOR,
} from '../constants/simulation.constant';
import {
  DEFAULT_FREEZE_AT_SECONDS,
  DEFAULT_FREEZE_HOLD_SECONDS,
  DEFAULT_RECORDING_DURATION_SECONDS,
  DEFAULT_RECORDING_PRESET,
  MAX_RECORDING_SECONDS,
  PATH_RECORDING_SAFETY_CAP_SECONDS,
  RECORDING_ERROR_EMPTY,
  RECORDING_ERROR_SHARE,
  RECORDING_ERROR_UNSUPPORTED,
  RECORDING_PRESETS,
  RECORDING_QUALITY_WARNING_SECONDS,
  RECORDING_REQUEST_DATA_NUDGE_MS,
  RECORDING_TIMESLICE_MS,
  RECORDING_WATCHDOG_MS,
} from '../constants/recording.constant';
import { ShootingStar } from '../models/shooting-star.model';
import { RecordingPreset } from '../models/recording.model';
import { RecordingResult } from '../models/recording-result.model';
import {
  CameraKeyframe,
  ControlKey,
  PanelSection,
  RecordingState,
  StarDepth,
  TravelDirection,
} from '../models/simulation.model';
import { Star } from '../models/star.model';
import { buildRecordingMimeLadder } from '../utils/recording-mime.util';
import { computeRecordingBitsPerSecond } from '../utils/recording-size.util';
import { AnalyticsService } from '@db-astro-suite/ui';

/** Size of the shooting star object pool for reuse */
const NUM_SHOOTING_STARS = 10;

/**
 * @class SimulationService
 * @description
 * Central state management service for the Starwizz simulation application.
 * This service acts as the single source of truth for all simulation state,
 * including control parameters, image management, star generation, and video recording.
 *
 * The service uses Angular signals for reactive state management, allowing
 * components to automatically respond to state changes without manual subscriptions.
 *
 * @responsibilities
 * - Manage simulation control parameters (zoom, rotation, star speeds, etc.)
 * - Handle image loading (default scene and user uploads)
 * - Generate and manage star collections (stars and shooting stars)
 * - Control video recording lifecycle (start, stop, download)
 * - Track UI state (loading progress, recording duration)
 *
 * @example
 * ```typescript
 * // Inject the service
 * constructor(private simService: SimulationService) {}
 *
 * // Access control values reactively
 * const zoomRate = this.simService.controls.zoomRate();
 *
 * // Update a control
 * this.simService.updateControl('zoomRate', 0.005);
 *
 * // Start recording
 * this.simService.startRecording(canvasElement);
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class SimulationService implements OnDestroy {
  private analyticsService = inject(AnalyticsService);

  // ==================== Control Signals ====================

  /**
   * Config-driven simulation control signals.
   * Each control is a WritableSignal initialized from the CONTROLS constant.
   * Controls include: zoomRate, rotationRate, shootingStarSpeed, starSpeed, baseStarSize
   */
  public readonly controls: Record<ControlKey, WritableSignal<number>> = {
    zoomRate: signal(CONTROLS['zoomRate'].initial),
    rotationRate: signal(CONTROLS['rotationRate'].initial),
    shootingStarSpeed: signal(CONTROLS['shootingStarSpeed'].initial),
    starSpeed: signal(CONTROLS['starSpeed'].initial),
    baseStarSize: signal(CONTROLS['baseStarSize'].initial),
    starCount: signal(CONTROLS['starCount'].initial),
    starColorIntensity: signal(CONTROLS['starColorIntensity'].initial),
    colorfulStarRatio: signal(CONTROLS['colorfulStarRatio'].initial),
    twinkleStrength: signal(CONTROLS['twinkleStrength'].initial),
    spikeAmount: signal(CONTROLS['spikeAmount'].initial),
  };

  /**
   * Direction the camera travels through the starfield. Read by the `Star`
   * model (per-frame motion) and the `Simulator` (galaxy zoom/pan direction).
   */
  public readonly travelDirection = signal<TravelDirection>('forward');

  // ==================== Custom Path (A→B) State ====================

  /** True when the active mode is the cinematic Custom Path (A→B). */
  public readonly isPathMode = computed(() => this.travelDirection() === 'path');

  /**
   * The framing the user is currently composing in the preview (pan + zoom).
   * Captured into {@link cameraStart} / {@link cameraEnd} and animated during playback.
   */
  public readonly liveCamera = signal<CameraKeyframe>({ panX: 0, panY: 0, scale: 1 });

  /** Captured Start (A) framing of the path, or null until set. */
  public readonly cameraStart = signal<CameraKeyframe | null>(null);

  /** Captured End (B) framing of the path, or null until set. */
  public readonly cameraEnd = signal<CameraKeyframe | null>(null);

  /** True while the camera is gliding A→B. */
  public readonly pathPlaying = signal<boolean>(false);

  /**
   * True once the user has fixed the path (locked A & B). While finalized the
   * preview is non-interactive and the path plays once from A to B.
   */
  public readonly pathFinalized = signal<boolean>(false);

  /** A→B travel speed, in world px per second (primary stored timing value). */
  public readonly pathSpeed = signal<number>(PATH_SPEED_DEFAULT);

  // ==================== Star Direction State ====================

  /**
   * Lateral star-drift angle in degrees (0 = right, 90 = up, 180 = left,
   * 270 = down). Only applied when {@link starLateralOn} is true.
   */
  public readonly starDirectionDeg = signal<number>(DIRECTION_STAR_DEFAULTS.forward.angleDeg);

  /** Radial depth component of the star motion (derived from A→B / the preset). */
  public readonly starDepth = signal<StarDepth>(DIRECTION_STAR_DEFAULTS.forward.depth);

  /** Whether lateral drift along {@link starDirectionDeg} is active (derived). */
  public readonly starLateralOn = signal<boolean>(DIRECTION_STAR_DEFAULTS.forward.lateralOn);

  /** True when the stars have any motion at all — gates shooting-star spawning. */
  public readonly hasStarMotion = computed(
    () => this.starDepth() !== 'none' || this.starLateralOn(),
  );

  /** True only when both Start and End framings have been captured. */
  public readonly canPlayPath = computed(() => !!this.cameraStart() && !!this.cameraEnd());

  /**
   * Straight-line A→B "distance" combining pan delta (world px) and a weighted
   * zoom delta, so the linked Speed ⇄ Duration fields stay sensible for pure
   * pans, pure zooms, and combinations. Zero until both keyframes are set.
   */
  public readonly pathDistance = computed(() => {
    const a = this.cameraStart();
    const b = this.cameraEnd();
    if (!a || !b) {
      return 0;
    }
    const dx = b.panX - a.panX;
    const dy = b.panY - a.panY;
    const dScale = (b.scale - a.scale) * PATH_SCALE_DISTANCE_WEIGHT;
    return Math.hypot(dx, dy, dScale);
  });

  /** A→B duration (seconds) derived from {@link pathDistance} and {@link pathSpeed}. */
  public readonly pathDurationSeconds = computed(() => {
    const speed = this.pathSpeed();
    if (speed <= 0) {
      return 0;
    }
    return this.pathDistance() / speed;
  });

  // ==================== UI State Signals ====================

  /**
   * Current state of video recording.
   * Possible values: 'idle' | 'recording'
   */
  recordingState = signal<RecordingState>('idle');

  /**
   * Human-readable loading progress message displayed in the UI.
   * Updates during initialization, star generation, and image loading.
   */
  loadingProgress = signal<string>('Initializing...');

  // ==================== Image State Signals ====================

  /**
   * Indicates whether any image (default or user-uploaded) is currently loaded.
   * When true, the simulation animation is active.
   */
  isImageLoaded = signal<boolean>(false);

  /**
   * Indicates whether the currently loaded image is the default galaxy image.
   * Used to differentiate between demo mode and user content.
   */
  isDefaultImage = signal<boolean>(false);

  /**
   * Indicates whether the default image is currently being loaded.
   * Used to prevent showing the upload dialog during initial load.
   */
  isLoadingDefaultImage = signal<boolean>(false);

  /**
   * Base64 data URL of the user-uploaded image.
   * Null when no user image is loaded.
   */
  userImage = signal<string | null>(null);

  /**
   * Current recording duration in seconds.
   * Increments every second while recording is active.
   */
  recordingDuration = signal<number>(0);

  /**
   * Active control-panel tab, shared between the desktop panel's segmented
   * tabs and the mobile sheet's bottom navigation.
   */
  activePanelSection = signal<PanelSection>('scene');

  /**
   * Whether to reset animation to the beginning before recording.
   * Controlled by the 'From Beginning' checkbox in the control panel.
   */
  recordFromBeginning = signal<boolean>(false);

  /**
   * Whether the animation restarts from its starting state when the clip ends
   * (seamlessly loopable video). When off, the animation stops on the final
   * frame instead and the scene stays held until restarted.
   */
  loopEnabled = signal<boolean>(true);

  /** Whether a custom total recording duration is active (regular modes only). */
  durationEnabled = signal<boolean>(false);

  /** Custom total recording duration in seconds (regular modes only). */
  recordingDurationSeconds = signal<number>(DEFAULT_RECORDING_DURATION_SECONDS);

  /**
   * Whether the Freeze frame option is active: a mid-clip pause in regular
   * modes, or an end-of-pass hold in Custom Path mode.
   */
  freezeFrameEnabled = signal<boolean>(false);

  /** Seconds into the clip at which the animation freezes (regular modes only). */
  freezeAtSeconds = signal<number>(DEFAULT_FREEZE_AT_SECONDS);

  /**
   * Seconds the frozen frame is held: mid-clip in regular modes (the
   * animation resumes afterwards), or at the end of the pass in path mode.
   */
  freezeHoldSeconds = signal<number>(DEFAULT_FREEZE_HOLD_SECONDS);

  /**
   * Whether the scene is currently frozen: the simulator keeps rendering (so
   * an active recording keeps capturing) but skips all motion updates.
   */
  sceneFrozen = signal<boolean>(false);

  /**
   * Effective total clip length in seconds for regular (non-path) modes: the
   * custom duration when enabled, otherwise the default recording cap.
   */
  recordingTargetSeconds = computed<number>(() =>
    this.durationEnabled() ? this.recordingDurationSeconds() : MAX_RECORDING_SECONDS,
  );

  /**
   * Whether the configured clip length is long enough that social platforms
   * are likely to recompress it noticeably (drives the panel hint).
   */
  isLongClipWarning = computed<boolean>(
    () => !this.isPathMode() && this.recordingTargetSeconds() > RECORDING_QUALITY_WARNING_SECONDS,
  );

  /**
   * Signal to request animation reset before recording.
   * When set to true, the simulator will reset its animation state
   * and then start recording. This is set back to false after handling.
   */
  resetAndRecordRequested = signal<boolean>(false);

  /**
   * Signal to request animation restart without starting recording.
   * When set to true, the simulator will reset its animation state to beginning.
   * This is set back to false after handling.
   */
  restartAnimationRequested = signal<boolean>(false);

  /**
   * The HTMLImageElement containing the loaded galaxy/background image.
   * Used by the Simulator component for canvas rendering.
   */
  galaxyImage = signal<HTMLImageElement | null>(null);

  // ==================== Format State ====================

  /**
   * Currently selected output format for the simulation canvas.
   * Affects canvas dimensions and output video size.
   */
  currentFormat = signal<FormatKey>(DEFAULT_FORMAT);

  /**
   * Toggles the recording state machine — idle ↔ recording. Centralised here
   * so multiple UI surfaces (desktop control panel, mobile sheet header) can
   * trigger recording without duplicating the logic. Byte-identical behaviour
   * to the previous ControlPanel implementation.
   */
  toggleRecording(): void {
    const currentState = this.recordingState();
    if (currentState === 'idle') {
      if (this.recordFromBeginning()) {
        this.resetAndRecordRequested.set(true);
      } else {
        this.recordingState.set('recording');
      }
    } else if (currentState === 'recording') {
      this.recordingState.set('idle');
    }
  }

  /**
   * Computed canvas dimensions based on the selected format.
   * Returns an object with width and height properties.
   */
  canvasDimensions = computed(() => {
    const format = this.currentFormat();
    return FORMATS[format];
  });

  /**
   * Recording quality preset chosen from the record split-button menu.
   * Bundles the capture frame rate and the encoder bitrate budget.
   */
  recordingPreset = signal<RecordingPreset>(DEFAULT_RECORDING_PRESET);

  /**
   * Encoder bitrate (bits per second) for the active preset at the selected
   * format's resolution — passed to MediaRecorder as `videoBitsPerSecond`.
   */
  recordingBitsPerSecond = computed(() => {
    const { width, height } = this.canvasDimensions();
    return computeRecordingBitsPerSecond(width, height, RECORDING_PRESETS[this.recordingPreset()]);
  });

  /**
   * User-facing recording error, or null when healthy. Set when every codec
   * fell back without producing data, when a finished recording is empty, or
   * when sharing fails. Cleared on the next recording attempt.
   */
  recordingError = signal<string | null>(null);

  /**
   * The most recent successfully finished recording, retained so the user can
   * re-save (or share) it if the browser's automatic download failed. Replaced
   * on each new recording; cleared on a full reset (image clear).
   */
  lastRecording = signal<RecordingResult | null>(null);

  /**
   * Whether the browser can hand {@link lastRecording} to the native share
   * sheet (Web Share API Level 2 with file support).
   */
  canShareLastRecording = computed<boolean>(() => {
    const recording = this.lastRecording();
    if (!recording || typeof navigator === 'undefined' || !navigator.canShare) {
      return false;
    }
    return navigator.canShare({ files: [this.toFile(recording)] });
  });

  // ==================== Star Collection Signals ====================

  /**
   * Collection of (background) stars.
   * These are slow-moving stars that create depth in the simulation.
   */
  stars = signal<Star[]>([]);

  /**
   * Pool of shooting stars available for spawning.
   * Stars are reused (object pooling) to avoid garbage collection during animation.
   */
  shootingStars = signal<ShootingStar[]>([]);

  /**
   * Whether shooting stars are rendered. When false they neither spawn nor draw,
   * and any in-flight streaks are cleared. Restored to true on a full reset.
   */
  shootingStarsEnabled = signal<boolean>(true);

  /**
   * Master switch for the whole starfield. When false the background stars and
   * shooting stars neither update nor draw — only the animated galaxy backdrop
   * remains — and all star controls are hidden. Restored to true on a full reset.
   */
  starsEnabled = signal<boolean>(true);

  // ==================== Private Recording State ====================

  /** MediaRecorder instance for capturing canvas stream */
  private mediaRecorder: MediaRecorder | null = null;

  /** Collected video data chunks during recording */
  private videoChunks: Blob[] = [];

  /** Timeout handle for auto-stopping recording at max duration */
  private recordingTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Interval handle for updating recording duration counter */
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  /** Timeout handle that freezes the scene mid-clip (regular modes). */
  private freezeTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Timeout handle that resumes motion after a mid-clip hold (regular modes). */
  private freezeResumeTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Timeout handle that ends the clip after a path-end hold (path mode). */
  private pathHoldTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Canvas being recorded — retained so a codec fallback can re-capture it. */
  private recordingCanvas: HTMLCanvasElement | null = null;

  /** MIME type of the in-flight recording attempt. */
  private activeMimeType: string | null = null;

  /**
   * Codecs that accepted `isTypeSupported` but failed to produce data at
   * runtime this session. Keys embed profile+level, so a blacklisted 1080p
   * rung never poisons the 4K rungs (different level byte → different key).
   */
  private readonly failedMimeTypes = new Set<string>();

  /** Watchdog handle — fires when no data chunk arrived in time. */
  private watchdogTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Handle for the `requestData()` nudge backstopping timeslice delivery. */
  private requestDataTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Object URL of the last downloaded recording. Deliberately NOT revoked at
   * download time — Chrome-Android resolves blob downloads asynchronously and
   * an immediate revoke races (and kills) the download (crbug 827932).
   * Revoked when the next recording starts or the service is destroyed.
   */
  private pendingObjectUrl: string | null = null;

  /**
   * Unique ID for the current star generation batch.
   * Used to abort previous generation if a new one starts (race condition prevention).
   */
  private currentGenerationId = 0;

  /**
   * True once the initial async star field has finished generating. Together with
   * {@link isLoadingDefaultImage} this gates the 'Ready' state so the loading
   * overlay stays up until BOTH the stars and the default scene image have settled.
   */
  private starsReady = false;

  // ==================== Control Methods ====================

  /**
   * Gets the current value of a simulation control.
   * @param control - The control key to retrieve
   * @returns The current numeric value of the control
   */
  getControlValue(control: ControlKey): number {
    return this.controls[control]();
  }

  /**
   * Gets the internal (scaled) value of a simulation control.
   * Applies the internalMultiplier from control metadata if defined.
   * @param control - The control key to retrieve
   * @returns The internal numeric value used for simulation calculations
   */
  getInternalValue(control: ControlKey): number {
    const uiValue = this.controls[control]();
    const multiplier = CONTROLS[control].internalMultiplier ?? 1;
    return uiValue * multiplier;
  }

  /**
   * Per-frame motion speed (internal units) for the background star field, read
   * by the `Star` model each frame. In a fixed Custom Path the field tracks the
   * camera's path pace — so the stars drift with the glide instead of stalling at
   * the (camera-independent) Star Speed rate — with the Star Speed slider acting
   * as a relative multiplier around its default. Every other mode uses the
   * slider's absolute internal value. (Shooting stars deliberately keep their own
   * slider-based speed for a steady, visible streak rate.)
   */
  getStarMotionSpeed(): number {
    if (!this.isPathMode() || !this.pathFinalized()) {
      return this.getInternalValue('starSpeed');
    }
    const cameraPacePerFrame = this.pathSpeed() / ASSUMED_FPS;
    const sliderFactor = this.controls.starSpeed() / CONTROLS['starSpeed'].initial;
    return cameraPacePerFrame * PATH_STAR_SPEED_FACTOR * sliderFactor;
  }

  /**
   * Updates a simulation control to a new value.
   * @param control - The control key to update
   * @param value - The new numeric value to set
   */
  updateControl(control: ControlKey, value: number) {
    this.controls[control].set(value);
  }

  /**
   * Updates the camera travel direction through the starfield. Leaving path
   * mode stops any in-progress glide.
   * @param direction - The new travel direction
   */
  updateDirection(direction: TravelDirection): void {
    this.travelDirection.set(direction);
    if (direction === 'path') {
      this.applyPathStarDefaults();
    } else {
      this.stopPath();
      this.pathFinalized.set(false);
      this.applyStarDefaults(direction);
    }
  }

  /** Sets the star depth + angle + lateral flag from a preset's defaults. */
  private applyStarDefaults(direction: TravelDirection): void {
    const defaults = DIRECTION_STAR_DEFAULTS[direction];
    this.starDepth.set(defaults.depth);
    this.starDirectionDeg.set(defaults.angleDeg);
    this.starLateralOn.set(defaults.lateralOn);
  }

  /**
   * The A→B pan angle in degrees (screen convention `vy = -sin θ`), or null when
   * there is no pan (or a keyframe is missing).
   */
  private pathPanAngle(): number | null {
    const a = this.cameraStart();
    const b = this.cameraEnd();
    if (!a || !b) {
      return null;
    }
    const dx = b.panX - a.panX;
    const dy = b.panY - a.panY;
    if (Math.hypot(dx, dy) <= 0.001) {
      return null;
    }
    let deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
    if (deg < 0) {
      deg += 360;
    }
    return Math.round(deg);
  }

  /**
   * Derives the star motion from the captured A→B framing, combining two
   * independent components: **depth** from the zoom change (out = zoom-in,
   * in = zoom-out, none = same zoom) **and** a **lateral drift** along the A→B
   * line whenever there's a pan. A diagonal zoom path therefore warps in/out
   * and drifts along the line at once. Falls back to the `path` defaults until
   * both points exist.
   */
  private applyPathStarDefaults(): void {
    const a = this.cameraStart();
    const b = this.cameraEnd();
    if (!a || !b) {
      this.applyStarDefaults('path');
      return;
    }
    // Depth from the zoom change (out = zoom-in, in = zoom-out, none = same zoom).
    const dScale = b.scale - a.scale;
    this.starDepth.set(dScale > 0.001 ? 'out' : dScale < -0.001 ? 'in' : 'none');

    // Lateral drift along the A→B line whenever there's a pan — combined with the
    // depth above, so a diagonal zoom path warps in/out AND drifts along the line.
    const angle = this.pathPanAngle();
    if (angle === null) {
      this.starLateralOn.set(false);
    } else {
      this.starDirectionDeg.set(angle);
      this.starLateralOn.set(true);
    }
  }

  // ==================== Custom Path (A→B) Methods ====================

  /**
   * Merges a partial framing into the live camera (immutably). Ignored while a
   * glide is playing so user input can't fight the animation.
   * @param patch - Partial pan/zoom to apply to the live framing
   */
  updateLiveCamera(patch: Partial<CameraKeyframe>): void {
    if (this.pathPlaying()) {
      return;
    }
    this.liveCamera.update((cam) => {
      const next = { ...cam, ...patch };
      next.scale = Math.min(MAX_ZOOM, Math.max(MIN_SCALE, next.scale));
      return this.clampCameraPan(next);
    });
  }

  /** Sets the live framing directly (used by playback interpolation). */
  setLiveCamera(camera: CameraKeyframe): void {
    this.liveCamera.set(this.clampCameraPan({ ...camera }));
  }

  /**
   * Clamps a framing's pan to the galaxy overscan at its zoom so the backdrop
   * never exposes an uncovered edge — keeping the preview WYSIWYG and captured
   * keyframes consistent with what the simulator renders.
   */
  private clampCameraPan(camera: CameraKeyframe): CameraKeyframe {
    const image = this.galaxyImage();
    if (!image || image.naturalWidth === 0) {
      return camera;
    }
    const { width, height } = this.canvasDimensions();
    const scaleFactor = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scaleFactor;
    const drawHeight = image.naturalHeight * scaleFactor;
    const limitX = Math.max(0, drawWidth / 2 - width / 2 / camera.scale);
    const limitY = Math.max(0, drawHeight / 2 - height / 2 / camera.scale);
    return {
      scale: camera.scale,
      panX: Math.max(-limitX, Math.min(limitX, camera.panX)),
      panY: Math.max(-limitY, Math.min(limitY, camera.panY)),
    };
  }

  /**
   * Toggles the optional lateral (sideways) star drift. Turning it on with no
   * angle yet seeds the angle from the A→B pan, when there is one.
   * @param on - Whether lateral drift is active
   */
  setStarLateral(on: boolean): void {
    if (on && this.starDirectionDeg() === 0) {
      const angle = this.pathPanAngle();
      if (angle !== null) {
        this.starDirectionDeg.set(angle);
      }
    }
    this.starLateralOn.set(on);
  }

  /**
   * Sets the lateral star-drift angle (degrees) and engages the lateral drift.
   * @param degrees - The drift angle (0 = right, 90 = up, 180 = left, 270 = down)
   */
  updateStarDirection(degrees: number): void {
    this.starDirectionDeg.set(degrees);
    this.starLateralOn.set(true);
  }

  /** Captures the current live framing as the path Start (A). */
  setCameraStart(): void {
    this.cameraStart.set({ ...this.liveCamera() });
  }

  /** Captures the current live framing as the path End (B). */
  setCameraEnd(): void {
    this.cameraEnd.set({ ...this.liveCamera() });
  }

  /** Begins the A→B glide if both framings are set; snaps the live camera to A. */
  playPath(): void {
    const start = this.cameraStart();
    if (!start || !this.cameraEnd()) {
      return;
    }
    this.setLiveCamera(start);
    this.pathPlaying.set(true);
  }

  /** Stops any in-progress glide. */
  stopPath(): void {
    if (this.pathPlaying()) {
      this.pathPlaying.set(false);
    }
  }

  /**
   * Fixes the path: locks A & B, then plays once from A to B (holds at B).
   * No-ops until both framings are captured.
   */
  finalizePath(): void {
    if (!this.canPlayPath()) {
      return;
    }
    this.applyPathStarDefaults();
    // Clear any streaks still in flight from the previous direction — they were
    // frozen mid-authoring and would otherwise resume with stale motion (e.g. a
    // radial 'forward' streak) that contradicts the freshly-derived path motion.
    // Fresh ones respawn with the correct depth + lateral drift.
    this.deactivateShootingStars();
    this.pathFinalized.set(true);
    this.playPath();
  }

  /** Deactivates every in-flight shooting star so the pool can respawn fresh. */
  private deactivateShootingStars(): void {
    for (const star of this.shootingStars()) {
      star.deactivate();
    }
  }

  /** Unlocks the path for re-composition (stops the loop, keeps A & B). */
  editPath(): void {
    this.pathFinalized.set(false);
    this.stopPath();
  }

  /**
   * Sets the A→B duration by deriving the travel speed (the "edit either" side
   * of the linked Speed ⇄ Duration fields). No-ops when the path has no length.
   * @param seconds - Desired A→B duration in seconds
   */
  setPathDuration(seconds: number): void {
    const distance = this.pathDistance();
    const clamped = Math.min(PATH_DURATION_MAX, Math.max(PATH_DURATION_MIN, seconds));
    if (distance <= 0 || clamped <= 0) {
      return;
    }
    this.pathSpeed.set(distance / clamped);
  }

  /** Clears all path state, zeroes the star motion, and recentres the live framing. */
  resetPath(): void {
    this.stopPath();
    this.pathFinalized.set(false);
    this.cameraStart.set(null);
    this.cameraEnd.set(null);
    this.pathSpeed.set(PATH_SPEED_DEFAULT);
    this.liveCamera.set({ panX: 0, panY: 0, scale: 1 });
    this.applyStarDefaults('path'); // none / no lateral — no star motion until a new path
  }

  /**
   * Resets all simulation controls to their default initial values.
   * Values are restored from the CONTROLS constant definitions, and the
   * travel direction is restored to 'forward'.
   */
  resetControlsToDefaults(): void {
    for (const key of Object.keys(this.controls) as ControlKey[]) {
      this.controls[key].set(CONTROLS[key].initial);
    }
    this.shootingStarsEnabled.set(true);
    this.starsEnabled.set(true);
    // Clear any custom path, then go through updateDirection so the star
    // direction/depth are reset to the 'forward' preset defaults too (a bare
    // travelDirection.set would leave the stars streaming the old way).
    this.resetPath();
    this.updateDirection('forward');
  }

  // ==================== Image Management ====================

  /**
   * Marks the initial async star field as fully generated, then re-evaluates the
   * loading state. Called by the simulator once {@link loadStarsAsync} completes.
   */
  markStarsReady(): void {
    this.starsReady = true;
    this.settleLoadingState();
  }

  /**
   * Flips loadingProgress to 'Ready' only once BOTH the star field has generated
   * AND the default scene image has settled (loaded or errored). While the stars
   * are done but the image is still in flight, it holds the loading message so the
   * overlay never disappears into a blank preview with no controls — the gap that
   * previously left the user stuck on initial load.
   */
  private settleLoadingState(): void {
    if (this.starsReady && !this.isLoadingDefaultImage()) {
      this.loadingProgress.set('Ready');
    } else {
      this.loadingProgress.set('Loading Default Scene...');
    }
  }

  /**
   * Loads the default galaxy image to showcase the simulation on startup.
   * This allows users to immediately see the animation without uploading an image.
   *
   * @description
   * - Sets loading progress to indicate loading state
   * - Creates an Image element and loads from DEFAULT_GALAXY_URL
   * - On success: updates galaxyImage, sets isDefaultImage and isImageLoaded to true
   * - On failure: logs error but still settles to 'Ready' (once stars are done) so
   *   the user can upload their own image
   */
  loadDefaultScene(): void {
    this.loadingProgress.set('Loading Default Scene...');
    this.isLoadingDefaultImage.set(true);

    const image = new Image();

    // Handle successful image load
    image.onload = () => {
      this.galaxyImage.set(image);
      this.isDefaultImage.set(true);
      this.isImageLoaded.set(true);
      this.isLoadingDefaultImage.set(false);
      // Only declare 'Ready' if the star field has also finished — otherwise the
      // star callback (markStarsReady) will, once it completes.
      this.settleLoadingState();
    };

    // Handle load failure gracefully
    image.onerror = () => {
      console.error('Failed to load default galaxy image.');
      this.isLoadingDefaultImage.set(false);
      // Settle so the user can upload their own image once stars are done.
      this.settleLoadingState();
    };

    image.src = DEFAULT_GALAXY_URL;
  }

  /**
   * Handles user image upload from a file input element.
   * Converts the uploaded file to a base64 data URL and loads it as the background.
   *
   * @param event - The change event from the file input element
   *
   * @description
   * - Extracts the file from the input event
   * - Uses FileReader to convert to base64 data URL
   * - Creates an Image element to load the data URL
   * - Updates state signals on successful load
   */
  handleImageUpload(event: Event): void {
    // Extract file from input element
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.loadingProgress.set('Loading Image...');

    const reader = new FileReader();

    // Process the file once read completes
    reader.onload = (e) => {
      const result = e.target?.result as string;

      // Store the base64 URL for potential future use
      this.userImage.set(result);

      // Create Image element to get dimensions and enable canvas drawing
      const image = new Image();

      image.onload = () => {
        this.galaxyImage.set(image);
        this.isDefaultImage.set(false); // User image, not default
        this.isImageLoaded.set(true);
        this.loadingProgress.set('Ready');
      };

      image.onerror = () => {
        console.error('Failed to load user image.');
        this.loadingProgress.set('Error loading image');
      };

      image.src = result;
    };

    // Start reading the file as base64
    reader.readAsDataURL(file);
  }

  /**
   * Clears the currently loaded image and returns the whole simulation to its
   * fresh-page state — image flags, output format, every control, the camera
   * direction, any custom path, and the shooting-star toggle — so the next
   * upload starts exactly as if the page had just loaded.
   * Called when user clicks the "Clear" button.
   */
  clearImage(): void {
    this.isDefaultImage.set(false);
    this.isImageLoaded.set(false);
    this.userImage.set(null);
    this.galaxyImage.set(null);
    this.currentFormat.set(DEFAULT_FORMAT);
    this.recordingPreset.set(DEFAULT_RECORDING_PRESET);
    this.recordingError.set(null);
    this.lastRecording.set(null);
    // Restores all sliders, the shooting-star toggle, the custom path, and the
    // forward star defaults (so the re-uploaded field animates immediately).
    this.resetControlsToDefaults();
  }

  // ==================== Star Generation ====================

  /**
   * Asynchronously generates ambient stars in batches to prevent UI blocking.
   * Uses requestAnimationFrame to yield control back to the browser between batches.
   *
   * @param width - Canvas width for star positioning
   * @param height - Canvas height for star positioning
   * @param callback - Function to call when all stars are generated
   *
   * @description
   * - Generates stars in batches of 50 to keep UI responsive
   * - Uses a generation ID to handle race conditions (if called again before completion)
   * - Updates loading progress with percentage during generation
   * - Automatically initializes shooting stars when stars are complete
   */
  loadStarsAsync(width: number, height: number, callback: () => void): void {
    let starsGenerated = 0;
    const BATCH_SIZE = 50;

    // Capture the target count once so a mid-generation slider change can't
    // shift the loop bounds underneath us (the live grow/shrink path is
    // handled separately by adjustStarCount once generation has completed).
    const total = this.controls.starCount();

    // Create unique ID for this generation run
    const generationId = Date.now();
    this.currentGenerationId = generationId;

    // Accumulate stars in local array before setting signal
    const currentStars: Star[] = [];

    const generateBatch = () => {
      // Abort if a newer generation has started (race condition prevention)
      if (this.currentGenerationId !== generationId) return;

      // Generate batch of stars
      const targetCount = Math.min(total, starsGenerated + BATCH_SIZE);
      while (starsGenerated < targetCount) {
        currentStars.push(new Star(width, height, this));
        starsGenerated++;
      }

      // Update progress indicator
      const percentage = Math.floor((starsGenerated / total) * 100);
      this.loadingProgress.set(`Generating Stars: ${percentage}%`);

      if (starsGenerated < total) {
        // More stars needed, schedule next batch on next frame
        requestAnimationFrame(generateBatch);
      } else {
        // All stars generated, update signal and initialize shooting stars
        this.stars.set(currentStars);
        this.initShootingStars(width, height);
        callback();
      }
    };

    // Start the batch generation
    generateBatch();
  }

  /**
   * Initializes the shooting star object pool.
   * Creates a fixed number of shooting stars that will be reused during animation.
   *
   * @param width - Canvas width for star positioning
   * @param height - Canvas height for star positioning
   */
  initShootingStars(width: number, height: number): void {
    const stars: ShootingStar[] = [];
    for (let i = 0; i < NUM_SHOOTING_STARS; i++) {
      stars.push(new ShootingStar(width, height, this));
    }
    this.shootingStars.set(stars);
  }

  /**
   * Grows or shrinks the background star field to match the current
   * `starCount` control, replacing the signal array immutably.
   *
   * No-ops while the field is empty (initial async generation is still in
   * flight or the simulation is between resets) so it never clobbers a
   * pending {@link loadStarsAsync} run. Added stars spawn at random depths
   * (the `Star` constructor randomises depth) so they fade in rather than pop.
   *
   * @param width - Canvas width for new star positioning
   * @param height - Canvas height for new star positioning
   */
  adjustStarCount(width: number, height: number): void {
    const target = this.controls.starCount();
    const current = this.stars();

    if (current.length === 0 || target === current.length) {
      return;
    }

    if (target < current.length) {
      this.stars.set(current.slice(0, target));
      return;
    }

    const additional: Star[] = [];
    for (let i = current.length; i < target; i++) {
      additional.push(new Star(width, height, this));
    }
    this.stars.set([...current, ...additional]);
  }

  /**
   * Clears all star collections.
   * Called when resetting the simulation or changing canvas dimensions.
   */
  resetStars(): void {
    this.stars.set([]);
    this.shootingStars.set([]);
  }

  // ==================== Video Recording ====================

  /**
   * Starts video recording of the canvas simulation.
   *
   * @param canvas - The HTMLCanvasElement to record
   *
   * @description
   * Entry point of the recording state machine. Revokes the previous
   * download's object URL (deferred from the last recording — see
   * {@link pendingObjectUrl}), clears any prior error, then delegates to
   * {@link attemptRecording}, which owns codec selection and runtime
   * fallback when an encoder fails to deliver data.
   */
  startRecording(canvas: HTMLCanvasElement): void {
    if (this.pendingObjectUrl) {
      URL.revokeObjectURL(this.pendingObjectUrl);
      this.pendingObjectUrl = null;
    }
    this.recordingError.set(null);
    this.recordingCanvas = canvas;
    this.attemptRecording();
  }

  /**
   * Starts one recording attempt on the best codec not yet known to be dead.
   *
   * `MediaRecorder.isTypeSupported()` is permissive — on Android it accepts
   * profile/level combinations the device encoder then rejects at runtime —
   * so every attempt is verified by a watchdog: if no data chunk arrives
   * within {@link RECORDING_WATCHDOG_MS} (or the recorder errors), the codec
   * is blacklisted for the session and the next ladder rung is tried.
   */
  private attemptRecording(): void {
    this.videoChunks = [];
    const canvas = this.recordingCanvas;
    let mimeType: string | null = null;
    try {
      mimeType = canvas ? this.nextSupportedMimeType() : null;
    } catch (e) {
      console.error('Error selecting recording codec:', e);
    }
    if (!canvas || mimeType === null) {
      this.failAllMimeTypes();
      return;
    }
    this.activeMimeType = mimeType;

    try {
      const fps = RECORDING_PRESETS[this.recordingPreset()].fps;
      // captureStream() is taken fresh per attempt — broken encoders can
      // leave a previous stream's track in a stale state on some devices.
      const stream = canvas.captureStream(fps);

      // Explicit bitrate — without it the browser default (~2.5 Mbps) badly
      // under-serves high-res/high-fps output.
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: this.recordingBitsPerSecond(),
      });
      this.setupRecorderListeners(this.mediaRecorder, mimeType);

      // Timeslice delivery: the first chunk's arrival is the encoder's
      // proof-of-life signal, and chunks concatenate into a valid file.
      this.mediaRecorder.start(RECORDING_TIMESLICE_MS);

      // (Re)start the visible duration timer and the auto-stop per attempt,
      // so the counter always matches actually-captured footage.
      this.recordingDuration.set(0);
      this.clearRecordingTimers();
      this.sceneFrozen.set(false);
      this.timerInterval = setInterval(() => {
        this.recordingDuration.update((d) => d + 1);
      }, 1000);
      this.armClipEndTimers();
      this.armEncoderWatchdog(this.mediaRecorder);
    } catch (e) {
      console.error('Error starting recording attempt:', e);
      this.handleEncoderFailure(this.mediaRecorder);
    }
  }

  /**
   * Picks the best MIME type for the current format/preset: the resolution-
   * matched ladder (minimum sufficient H.264 level — over-asking breaks
   * budget Android encoders), minus codecs already proven dead this session.
   *
   * @returns The MIME type to try, or null when nothing is left
   */
  private nextSupportedMimeType(): string | null {
    const { width, height } = this.canvasDimensions();
    const fps = RECORDING_PRESETS[this.recordingPreset()].fps;
    const ladder = buildRecordingMimeLadder(width, height, fps, this.recordingBitsPerSecond());
    return (
      ladder
        .filter((type) => !this.failedMimeTypes.has(type))
        .find((type) => MediaRecorder.isTypeSupported(type)) ?? null
    );
  }

  /**
   * Arms the proof-of-life timers for a recording attempt: a `requestData()`
   * nudge (backstop for browsers that ignore the timeslice) and the watchdog
   * that declares the encoder dead when no chunk has arrived in time.
   *
   * @param recorder - The recorder this watchdog belongs to (identity-checked
   *   on fire so a stale timer can never touch a newer attempt)
   */
  private armEncoderWatchdog(recorder: MediaRecorder): void {
    this.requestDataTimeout = setTimeout(() => {
      if (recorder === this.mediaRecorder && recorder.state === 'recording') {
        recorder.requestData();
      }
    }, RECORDING_REQUEST_DATA_NUDGE_MS);

    this.watchdogTimeout = setTimeout(() => {
      if (recorder !== this.mediaRecorder || this.videoChunks.length > 0) {
        return;
      }
      // A hidden tab paints no canvas frames — a healthy encoder legitimately
      // produces nothing. Re-arm instead of falling back.
      if (document.visibilityState === 'hidden') {
        this.armEncoderWatchdog(recorder);
        return;
      }
      this.handleEncoderFailure(recorder);
    }, RECORDING_WATCHDOG_MS);
  }

  /**
   * Handles a dead recording attempt (runtime `error` event, watchdog firing
   * with zero chunks, or a throwing start): blacklists the codec for the
   * session and retries on the next ladder rung, or gives up visibly when
   * the ladder is exhausted. `recordingState` stays `'recording'` throughout
   * a fallback so the simulator's recording effect does not re-fire.
   *
   * @param recorder - The recorder that failed (identity-checked)
   */
  private handleEncoderFailure(recorder: MediaRecorder | null): void {
    if (this.recordingState() !== 'recording' || recorder !== this.mediaRecorder) {
      return;
    }
    if (this.activeMimeType !== null) {
      this.failedMimeTypes.add(this.activeMimeType);
    }
    // Detach handlers BEFORE stop() so the dead recorder's onstop never
    // reaches the download path.
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }
    this.clearRecordingTimers();
    this.mediaRecorder = null;
    this.videoChunks = [];

    // Honor "record from beginning" on the retry too.
    if (this.recordFromBeginning()) {
      this.restartAnimationRequested.set(true);
    }

    // Try the next rung; attemptRecording fails-all when nothing is left.
    this.attemptRecording();
  }

  /** Terminal failure: every codec rung is dead. Surface it — never silent. */
  private failAllMimeTypes(): void {
    console.error('Recording failed: no supported video codec produced data.');
    this.recordingError.set(RECORDING_ERROR_UNSUPPORTED);
    this.clearRecordingTimers();
    this.mediaRecorder = null;
    this.recordingCanvas = null;
    this.activeMimeType = null;
    this.recordingState.set('idle');
  }

  /**
   * Arms the timers that end the clip at its planned boundary for one
   * recording attempt.
   *
   * Regular modes: the clip always ends at {@link recordingTargetSeconds};
   * when Freeze frame is on (and the freeze point falls inside the clip) the
   * scene freezes at F seconds and resumes at F + hold — unless the hold
   * runs past the clip end, in which case it stays frozen until the finish.
   *
   * Custom Path mode: the clip ends when the A→B pass completes (the
   * simulator calls {@link onPathPassComplete}); the timeout armed here is
   * only a runaway safety net.
   */
  private armClipEndTimers(): void {
    if (this.isPathMode() && this.pathFinalized()) {
      this.recordingTimeout = setTimeout(
        () => this.finishClip(),
        PATH_RECORDING_SAFETY_CAP_SECONDS * 1000,
      );
      return;
    }

    const target = this.recordingTargetSeconds();
    this.recordingTimeout = setTimeout(() => this.finishClip(), target * 1000);

    const freezeAt = this.freezeAtSeconds();
    if (this.freezeFrameEnabled() && freezeAt < target) {
      this.freezeTimeout = setTimeout(() => this.sceneFrozen.set(true), freezeAt * 1000);
      const resumeAt = freezeAt + this.freezeHoldSeconds();
      if (resumeAt < target) {
        this.freezeResumeTimeout = setTimeout(
          () => this.sceneFrozen.set(false),
          resumeAt * 1000,
        );
      }
    }
  }

  /**
   * Ends the clip at its planned boundary: stops the recorder, then applies
   * the Loop setting — on, the animation restarts from its starting state at
   * this exact moment so the exported video loops seamlessly; off, the scene
   * holds its final frame until the user restarts or records again.
   */
  private finishClip(): void {
    this.stopRecording();
    if (this.loopEnabled()) {
      this.sceneFrozen.set(false);
      this.restartAnimationRequested.set(true);
    } else {
      this.sceneFrozen.set(true);
    }
  }

  /**
   * Called by the simulator when a Custom Path A→B pass completes while a
   * recording is active: optionally holds the final frame for the configured
   * seconds (the recording keeps capturing), then ends the clip.
   */
  onPathPassComplete(): void {
    if (!this.isRecording()) {
      return;
    }
    if (this.freezeFrameEnabled() && this.freezeHoldSeconds() > 0) {
      this.sceneFrozen.set(true);
      this.pathHoldTimeout = setTimeout(() => this.finishClip(), this.freezeHoldSeconds() * 1000);
    } else {
      this.finishClip();
    }
  }

  /**
   * Updates the Loop option; switching it on releases a clip-end hold so the
   * scene visibly resumes.
   */
  setLoopEnabled(on: boolean): void {
    this.loopEnabled.set(on);
    if (on) {
      this.sceneFrozen.set(false);
    }
  }

  /** Clears the duration interval, auto-stop, freeze, watchdog, and nudge timers. */
  private clearRecordingTimers(): void {
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.freezeTimeout) {
      clearTimeout(this.freezeTimeout);
      this.freezeTimeout = null;
    }
    if (this.freezeResumeTimeout) {
      clearTimeout(this.freezeResumeTimeout);
      this.freezeResumeTimeout = null;
    }
    if (this.pathHoldTimeout) {
      clearTimeout(this.pathHoldTimeout);
      this.pathHoldTimeout = null;
    }
    if (this.watchdogTimeout) {
      clearTimeout(this.watchdogTimeout);
      this.watchdogTimeout = null;
    }
    if (this.requestDataTimeout) {
      clearTimeout(this.requestDataTimeout);
      this.requestDataTimeout = null;
    }
  }

  /**
   * Stops the active video recording session.
   * Clears timers and triggers the MediaRecorder to finalize.
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      // Stop the recorder (will trigger onstop event)
      this.mediaRecorder.stop();
      this.clearRecordingTimers();
    }
  }

  /**
   * Re-saves the retained last recording via a fresh user-gesture download.
   * Recovery path for failed automatic downloads — anchor downloads give the
   * page no success/failure feedback, so the user is the only one who knows.
   */
  saveLastRecording(): void {
    const recording = this.lastRecording();
    if (!recording) {
      return;
    }
    if (this.pendingObjectUrl) {
      URL.revokeObjectURL(this.pendingObjectUrl);
    }
    this.pendingObjectUrl = URL.createObjectURL(recording.blob);
    this.triggerDownload(this.pendingObjectUrl, recording.filename);
  }

  /**
   * Hands the retained last recording to the native share sheet (save to
   * gallery / share straight to social apps). Closing the sheet is not an
   * error; real share failures surface via {@link recordingError}.
   */
  async shareLastRecording(): Promise<void> {
    const recording = this.lastRecording();
    if (!recording || !this.canShareLastRecording()) {
      return;
    }
    try {
      await navigator.share({ files: [this.toFile(recording)] });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return; // User dismissed the share sheet.
      }
      console.error('Error sharing recording:', e);
      this.recordingError.set(RECORDING_ERROR_SHARE);
    }
  }

  /** Releases the deferred object URL and all recording timers on teardown. */
  ngOnDestroy(): void {
    if (this.pendingObjectUrl) {
      URL.revokeObjectURL(this.pendingObjectUrl);
      this.pendingObjectUrl = null;
    }
    this.clearRecordingTimers();
  }

  /**
   * Sets up event listeners for a MediaRecorder attempt: chunk collection
   * (the first chunk also disarms the watchdog), runtime-error fallback,
   * and finalization.
   *
   * @param recorder - The recorder to wire up
   * @param mimeType - The video MIME type for blob creation
   */
  private setupRecorderListeners(recorder: MediaRecorder, mimeType: string): void {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.videoChunks.push(e.data);
        // Proof of life — the encoder works; stand the watchdog down.
        if (this.watchdogTimeout) {
          clearTimeout(this.watchdogTimeout);
          this.watchdogTimeout = null;
        }
        if (this.requestDataTimeout) {
          clearTimeout(this.requestDataTimeout);
          this.requestDataTimeout = null;
        }
      }
    };

    // Runtime encoder rejection (the permissive-isTypeSupported case) —
    // previously unhandled, which silently produced 0-byte downloads.
    recorder.onerror = () => {
      this.handleEncoderFailure(recorder);
    };

    // Handle recording completion
    recorder.onstop = () => {
      this.handleRecordingStop(mimeType);
    };
  }

  /**
   * Processes the recorded video and triggers a file download.
   * Called when the MediaRecorder stops.
   *
   * @param mimeType - The video MIME type for file extension detection
   *
   * @description
   * - Guards against empty recordings (surfaces an error instead of a dead download)
   * - Retains the result in {@link lastRecording} for user-driven re-save/share
   * - Downloads via a DOM-attached anchor; the object URL is deliberately NOT
   *   revoked here — deferred to the next recording (see {@link pendingObjectUrl})
   */
  private handleRecordingStop(mimeType: string): void {
    // Combine all chunks into a single video blob, then drop the chunk
    // array immediately to halve peak memory.
    const blob = new Blob(this.videoChunks, { type: mimeType });
    this.videoChunks = [];
    this.recordingState.set('idle');
    this.mediaRecorder = null;
    this.recordingCanvas = null;
    this.activeMimeType = null;

    if (blob.size === 0) {
      // Nothing was captured — a dead download would just confuse the user.
      console.error('Recording finished with no data.');
      this.recordingError.set(RECORDING_ERROR_EMPTY);
      return;
    }

    // Determine file extension based on format
    const extension = mimeType.includes('mp4') ? '.mp4' : '.webm';

    // Compose filename as `starfield_starwizz_<aspect>_<w>_<h>.<ext>` so the
    // saved file carries both a human-readable basename and the aspect /
    // resolution the recording was rendered at.
    const { width, height } = this.canvasDimensions();
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const g = gcd(width, height) || 1;
    const aspectSlug = `${width / g}_${height / g}`;
    const filename = `starfield_starwizz_${aspectSlug}_${width}_${height}${extension}`;

    // Retain the result so the user can re-save/share if the automatic
    // download fails (the page gets no feedback from anchor downloads).
    this.lastRecording.set({
      blob,
      filename,
      mimeType,
      sizeMb: Math.round(blob.size / 1_000_000),
    });

    this.pendingObjectUrl = URL.createObjectURL(blob);
    this.triggerDownload(this.pendingObjectUrl, filename);

    // Track video generation event
    const videoFormat = extension.substring(1); // Remove leading dot
    this.analyticsService.trackVideoGeneration('starwizz-user', videoFormat);
  }

  /**
   * Clicks a DOM-attached download anchor for the given object URL. The URL
   * is NOT revoked here — Chrome-Android resolves blob downloads
   * asynchronously and revoking immediately races (and kills) the download
   * (crbug 827932).
   *
   * @param url - Object URL to download
   * @param filename - Suggested filename
   */
  private triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /**
   * Wraps a retained recording's blob as a File for the Web Share API.
   * @param recording - The retained recording
   */
  private toFile(recording: RecordingResult): File {
    return new File([recording.blob], recording.filename, { type: recording.mimeType });
  }

  /**
   * Checks if video recording is currently active.
   * @returns True if MediaRecorder is in 'recording' state
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
