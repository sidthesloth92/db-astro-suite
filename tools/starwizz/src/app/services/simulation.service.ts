import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import {
  CONTROLS,
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
} from '../constants/simulation.constant';
import { ShootingStar } from '../models/shooting-star.model';
import {
  CameraKeyframe,
  ControlKey,
  RecordingState,
  StarDepth,
  TravelDirection,
} from '../models/simulation.model';
import { Star } from '../models/star.model';
import { AnalyticsService } from '@db-astro-suite/ui';

/** Frame rate for video recording (frames per second) */
const FRAME_RATE = 60;

/** Maximum allowed recording duration in seconds before auto-stop */
const MAX_RECORDING_SECONDS = 30;

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
export class SimulationService {
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
   * Whether to reset animation to the beginning before recording.
   * Controlled by the 'From Beginning' checkbox in the control panel.
   */
  recordFromBeginning = signal<boolean>(false);

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
  currentFormat = signal<FormatKey>('reels');

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

  // ==================== Private Recording State ====================

  /** MediaRecorder instance for capturing canvas stream */
  private mediaRecorder: MediaRecorder | null = null;

  /** Collected video data chunks during recording */
  private videoChunks: Blob[] = [];

  /** Timeout handle for auto-stopping recording at max duration */
  private recordingTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Interval handle for updating recording duration counter */
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Unique ID for the current star generation batch.
   * Used to abort previous generation if a new one starts (race condition prevention).
   */
  private currentGenerationId = 0;

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
    this.pathFinalized.set(true);
    this.playPath();
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
    // Clear any custom path, then go through updateDirection so the star
    // direction/depth are reset to the 'forward' preset defaults too (a bare
    // travelDirection.set would leave the stars streaming the old way).
    this.resetPath();
    this.updateDirection('forward');
  }

  // ==================== Image Management ====================

  /**
   * Loads the default galaxy image to showcase the simulation on startup.
   * This allows users to immediately see the animation without uploading an image.
   *
   * @description
   * - Sets loading progress to indicate loading state
   * - Creates an Image element and loads from DEFAULT_GALAXY_URL
   * - On success: updates galaxyImage, sets isDefaultImage and isImageLoaded to true
   * - On failure: logs error but still sets progress to 'Ready' so user can upload
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
      this.loadingProgress.set('Ready');
    };

    // Handle load failure gracefully
    image.onerror = () => {
      console.error('Failed to load default galaxy image.');
      this.isLoadingDefaultImage.set(false);
      // Still show 'Ready' so user can upload their own image
      this.loadingProgress.set('Ready');
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
   * Clears the currently loaded image and resets related state.
   * Called when user clicks the "Clear" button.
   */
  clearImage(): void {
    this.isDefaultImage.set(false);
    this.isImageLoaded.set(false);
    this.userImage.set(null);
    this.galaxyImage.set(null);
    this.resetPath();
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
   * Captures the canvas stream and initializes MediaRecorder.
   *
   * @param canvas - The HTMLCanvasElement to record
   *
   * @description
   * - Captures canvas stream at configured frame rate
   * - Detects best supported video codec (MP4 preferred, WebM fallback)
   * - Sets up recording duration timer (updates every second)
   * - Configures auto-stop at MAX_RECORDING_SECONDS
   * - Handles errors gracefully by resetting to idle state
   */
  startRecording(canvas: HTMLCanvasElement): void {
    // Clear any previous recording chunks
    this.videoChunks = [];

    try {
      // Capture the canvas as a media stream
      // captureStream() is not in the TypeScript lib.dom.d.ts typings (non-standard API); cast required
      const stream = (canvas as any).captureStream(FRAME_RATE); // eslint-disable-line @typescript-eslint/no-explicit-any

      // Detect the best supported video format
      const mimeType = this.getSupportedMimeType();

      // Initialize the MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.setupRecorderListeners(mimeType);

      // Start recording
      this.mediaRecorder.start();

      // Initialize and start the duration timer
      this.recordingDuration.set(0);
      this.timerInterval = setInterval(() => {
        this.recordingDuration.update((d) => d + 1);
      }, 1000);

      // Set up auto-stop at max duration
      this.recordingTimeout = setTimeout(() => this.stopRecording(), MAX_RECORDING_SECONDS * 1000);
    } catch (e) {
      console.error('Error starting recording:', e);
      // Handle initialization errors (e.g., browser permission denied)
      this.recordingState.set('idle');
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

      // Clear the auto-stop timeout
      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
        this.recordingTimeout = null;
      }

      // Clear the duration timer
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }
  }

  /**
   * Detects the best supported video MIME type for the current browser.
   * Prefers MP4 for wider compatibility, falls back to WebM.
   *
   * @returns The supported MIME type string
   */
  private getSupportedMimeType(): string {
    const types = ['video/mp4; codecs="avc1.42E01E, mp4a.40.2"', 'video/mp4', 'video/webm'];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';
  }

  /**
   * Sets up event listeners for the MediaRecorder.
   * Handles data collection and recording finalization.
   *
   * @param mimeType - The video MIME type for blob creation
   */
  private setupRecorderListeners(mimeType: string): void {
    if (!this.mediaRecorder) return;

    // Collect video chunks as they become available
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.videoChunks.push(e.data);
      }
    };

    // Handle recording completion
    this.mediaRecorder.onstop = () => {
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
   * - Creates a Blob from collected video chunks
   * - Generates a temporary object URL for download
   * - Creates and clicks a download link programmatically
   * - Cleans up the object URL and resets recording state
   */
  private handleRecordingStop(mimeType: string): void {
    // Combine all chunks into a single video blob
    const blob = new Blob(this.videoChunks, { type: mimeType });

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);

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

    // Trigger download via programmatic link click
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    // Clean up
    URL.revokeObjectURL(url);
    this.recordingState.set('idle');
    this.mediaRecorder = null;

    // Track video generation event
    const videoFormat = extension.substring(1); // Remove leading dot
    this.analyticsService.trackVideoGeneration('starwizz-user', videoFormat);
  }

  /**
   * Checks if video recording is currently active.
   * @returns True if MediaRecorder is in 'recording' state
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
