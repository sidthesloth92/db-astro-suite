import { Injectable, signal, WritableSignal, computed } from '@angular/core';
import { RecordingState, ControlKey } from '../models/simulation.model';
import { CONTROLS, ASPECT_RATIOS, AspectRatioKey, DEFAULT_GALAXY_URL } from '../constants/simulation.constant';
import { Star } from '../models/star.model';
import { ShootingStar } from '../models/shooting-star.model';

/** Frame rate for video recording (frames per second) */
const FRAME_RATE = 60;

/** Maximum allowed recording duration in seconds before auto-stop */
const MAX_RECORDING_SECONDS = 30;

/** Total number of (background) stars to generate */
const NUM_STARS = 1000;

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
  };

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

  // ==================== Aspect Ratio State ====================

  /**
   * Currently selected aspect ratio for the simulation canvas.
   * Affects canvas dimensions and output video size.
   */
  currentAspectRatio = signal<AspectRatioKey>('9:16');

  /**
   * Computed canvas dimensions based on the selected aspect ratio.
   * Returns an object with width and height properties.
   */
  canvasDimensions = computed(() => {
    const ratio = this.currentAspectRatio();
    return ASPECT_RATIOS[ratio];
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
   * Resets all simulation controls to their default initial values.
   * Values are restored from the CONTROLS constant definitions.
   */
  resetControlsToDefaults(): void {
    for (const key of Object.keys(this.controls) as ControlKey[]) {
      this.controls[key].set(CONTROLS[key].initial);
    }
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
   * Called when user clicks the "Clear Target" button.
   */
  clearImage(): void {
    this.isDefaultImage.set(false);
    this.isImageLoaded.set(false);
    this.userImage.set(null);
    this.galaxyImage.set(null);
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

    // Create unique ID for this generation run
    const generationId = Date.now();
    this.currentGenerationId = generationId;

    // Accumulate stars in local array before setting signal
    const currentStars: Star[] = [];

    const generateBatch = () => {
      // Abort if a newer generation has started (race condition prevention)
      if (this.currentGenerationId !== generationId) return;

      // Generate batch of stars
      const targetCount = Math.min(NUM_STARS, starsGenerated + BATCH_SIZE);
      while (starsGenerated < targetCount) {
        currentStars.push(new Star(width, height, this));
        starsGenerated++;
      }

      // Update progress indicator
      const percentage = Math.floor((starsGenerated / NUM_STARS) * 100);
      this.loadingProgress.set(`Generating Stars: ${percentage}%`);

      if (starsGenerated < NUM_STARS) {
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
      const stream = (canvas as any).captureStream(FRAME_RATE);

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
      // Handle initialization errors (e.g., browser permission denied)
      console.error('Error starting recording:', e);
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

    // Trigger download via programmatic link click
    const a = document.createElement('a');
    a.href = url;
    a.download = `starfield-simulation${extension}`;
    a.click();

    // Clean up
    URL.revokeObjectURL(url);
    this.recordingState.set('idle');
    this.mediaRecorder = null;
  }

  /**
   * Checks if video recording is currently active.
   * @returns True if MediaRecorder is in 'recording' state
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
