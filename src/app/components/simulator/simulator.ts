import { Component, AfterViewInit, Inject, PLATFORM_ID, ElementRef, ViewChild, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimulationService } from '../../services/simulation.service';
import { AmbientStar } from '../../models/ambient-star.model';
import { ShootingStar } from '../../models/shooting-star.model';
import { DEFAULT_GALAXY_URL } from '../../constants/simulation.constant';

/**
 * Configuration and Asset URLs
 */
const TARGET_SCALE = 2.5;
const NUM_SHOOTING_STARS = 10;
const NUM_AMBIENT_STARS = 1000;
const FRAME_RATE = 60;
const MAX_RECORDING_SECONDS = 30;

/**
 * Shooting Star Specific Constants
 */
const SHOOTING_STAR_SPAWN_RATE = 1.5;

/**
 * @class Simulator
 * @description
 * Main simulation component responsible for rendering a dynamic starfield with a galaxy background.
 * It handles canvas-based rendering, star lifecycle management, and video recording.
 */
@Component({
  selector: 'sw-simulator',
  templateUrl: './simulator.html',
  styleUrl: './simulator.css',
  standalone: true,
  imports: [CommonModule],
})
export class Simulator implements AfterViewInit {
  @ViewChild('starCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  // Rendering State
  private galaxyImage: HTMLImageElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private centerX = 0;
  private centerY = 0;
  private currentScale = 1.0;
  private currentRotation = 0;
  private starTexture: HTMLCanvasElement | null = null;

  // Star Collection
  private ambientStars: AmbientStar[] = [];
  private shootingStars: ShootingStar[] = [];
  private lastShootingStarSpawn = 0;

  // Recording State
  private mediaRecorder: MediaRecorder | null = null;
  private videoChunks: Blob[] = [];
  private recordingTimeout: any;
  private timerInterval: any;
  private currentGenerationId = 0;
  private animationFrameId: number | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public simService: SimulationService
  ) {
    /**
     * Effect to respond to recording state changes in the SimulationService.
     * Automatically triggers start/stop recording based on service state.
     */
    effect(() => {
      const state = this.simService.recordingState();
      if (state === 'recording' && !this.mediaRecorder) {
        // Start recording if requested and not already running
        this.startRecording();
      } else if (state === 'idle' && this.mediaRecorder?.state === 'recording') {
        // Stop recording if idle requested and currently recording
        this.stopRecording();
      }
    });

    /**
     * Effect to respond to canvas dimension changes in the SimulationService.
     * Ensures the simulation adapts if screen size or aspect ratio is changed dynamically.
     */
    effect(() => {
      const dims = this.simService.canvasDimensions();
      
      if (this.ctx) {
        this.setupCanvasDimensions(dims);
        this.resetSimulation();
      }
    });
  }

  /**
   * Angular Lifecycle Hook: AfterViewInit
   * Ensures the canvas is available before initializing the simulation.
   */
  ngAfterViewInit() {
    this.init();
  }

  /**
   * Initializes the simulation environment by setting up the canvas,
   * starting star generation, and loading assets.
   */
  private init() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    
    this.setupCanvasDimensions();
    this.generateStarTexture();
    this.simService.loadingProgress.set('Initializing...');

    // Load default scene so user sees what the tool can do
    this.loadDefaultScene();

    // Small delay to allow initial UI to render before heavy star generation
    setTimeout(() => {
      this.loadStarsAsync(() => {
        this.simService.loadingProgress.set('Ready');
      });
    }, 10);

    this.animate();
    window.addEventListener('resize', () => this.setupCanvasDimensions());
  }

  /**
   * Loads the default galaxy image to showcase the tool's capabilities.
   */
  private loadDefaultScene() {
    this.simService.loadingProgress.set('Loading Default Scene...');
    
    this.galaxyImage = new Image();
    this.galaxyImage.onload = () => {
      this.simService.isDefaultImage.set(true);
      this.simService.isImageLoaded.set(true);
      this.simService.loadingProgress.set('Ready');
      this.lastShootingStarSpawn = Date.now();
    };
    this.galaxyImage.onerror = () => {
      console.error('Failed to load default galaxy image.');
      this.simService.loadingProgress.set('Ready'); // Still show 'Ready' so user can upload
    };
    this.galaxyImage.src = DEFAULT_GALAXY_URL;
  }

  /**
   * Configures canvas resolution and scale.
   * Uses a high resolution (1080x1920) for consistent recording quality
   * @param overrideDims Optional dimensions to use, defaults to service values.
   */
  private setupCanvasDimensions = (overrideDims?: { width: number, height: number }) => {
    const canvas = this.canvasRef.nativeElement;
    
    const dims = overrideDims || this.simService.canvasDimensions();
    canvas.width = dims.width;
    canvas.height = dims.height;
    
    this.width = dims.width;
    this.height = dims.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
  };

  /**
   * Resets the animation state and re-generates stars to fit new dimensions.
   */
  private resetSimulation() {
    this.currentScale = 1.0;
    this.currentRotation = 0;
    this.ambientStars = [];
    this.shootingStars = [];
    this.simService.loadingProgress.set('Re-initializing...');
    
    this.loadStarsAsync(() => {
      this.simService.loadingProgress.set('Ready');
    });
  }

  /**
   * Asynchronously generates stars in batches to avoid blocking the UI thread.
   * @param callback Function to execute once all ambient stars are generated.
   */
  private loadStarsAsync(callback: () => void) {
    let starsGenerated = 0;
    const BATCH_SIZE = 50;
    const generationId = Date.now();
    this.currentGenerationId = generationId;

    const generateBatch = () => {
      if (this.currentGenerationId !== generationId) return; // Abort if a new generation started

      const targetCount = Math.min(NUM_AMBIENT_STARS, starsGenerated + BATCH_SIZE);
      while (starsGenerated < targetCount) {
        this.ambientStars.push(new AmbientStar(this.width, this.height, this.simService));
        starsGenerated++;
      }

      const percentage = Math.floor((starsGenerated / NUM_AMBIENT_STARS) * 100);
      this.simService.loadingProgress.set(`Generating Stars: ${percentage}%`);

      if (starsGenerated < NUM_AMBIENT_STARS) {
        // More stars needed, schedule next batch on next animation frame
        requestAnimationFrame(generateBatch);
      } else {
        // All stars generated, proceed to final asset initialization
        this.initShootingStars();
        callback();
      }
    };
    generateBatch();
  }

  /**
   * Pre-populates the pool of shooting stars.
   */
  private initShootingStars() {
    for (let i = 0; i < NUM_SHOOTING_STARS; i++) {
      this.shootingStars.push(new ShootingStar(this.width, this.height, this.simService));
    }
  }

  /**
   * Handles user image upload via file input.
   */
  handleImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.simService.loadingProgress.set('Loading Image...');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.simService.userImage.set(result);
      
      this.galaxyImage = new Image();
    this.galaxyImage.onload = () => {
      this.simService.isDefaultImage.set(false);
      this.simService.isImageLoaded.set(true);
        this.simService.loadingProgress.set('Ready');
        this.lastShootingStarSpawn = Date.now();
      };
      this.galaxyImage.onerror = () => {
        console.error('Failed to load user image.');
        this.simService.loadingProgress.set('Error loading image');
      };
      this.galaxyImage.src = result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Clears the current user image and stops the simulation.
   */
  clearImage() {
    this.simService.isDefaultImage.set(false);
    this.simService.isImageLoaded.set(false);
    this.simService.userImage.set(null);
    this.galaxyImage = null;
    this.currentScale = 1.0;
    this.currentRotation = 0;
  }

  /**
   * Generates a reusable radial gradient texture for stars.
   * This is used as a sprite to achieve a soft "glow" effect more efficiently
   * than drawing multiple transparent arcs for every star.
   */
  private generateStarTexture() {
    const size = 128;
    const half = size / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Canvas 2D context failed to initialize, abort texture generation
      return;
    }

    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    this.starTexture = canvas;
  }

  /**
   * Main Animation Loop
   * Executes every frame to update state and render the scene.
   */
  private animate = () => {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    if (!this.ctx) {
      return;
    }

    // Only update movement state if a mission has been initialized
    if (this.simService.isImageLoaded()) {
      this.updateGlobalState();
      this.handleShootingStarSpawning();
    }

    this.renderFrame();
  };

  /**
   * Updates rotation, scale (zoom), and other global simulation parameters.
   */
  private updateGlobalState() {
    // Apply rotation increment
    this.currentRotation += this.simService.controls.rotationRate();
    
    // Handle infinite zoom loop logic
    if (this.currentScale < TARGET_SCALE) {
      // Scaling up towards the target zoom limit
      this.currentScale += this.simService.controls.zoomRate();
    } else {
      // Target scale reached, "loop" back to initial zoom for infinity effect
      this.currentScale = 1.0;
    }
  }

  /**
   * Periodically spawns new shooting stars from the available pool.
   */
  private handleShootingStarSpawning() {
    const now = Date.now();
    const timeSinceLastSpawn = (now - this.lastShootingStarSpawn) / 1000;
    
    if (timeSinceLastSpawn > (1 / SHOOTING_STAR_SPAWN_RATE)) {
      // Time to attempt spawning a new shooting star based on spawn rate
      for (const star of this.shootingStars) {
        if (!star.isActive) {
          // Found an available inactive star in the pool to reuse
          star.spawn();
          this.lastShootingStarSpawn = now;
          break;
        }
      }
    }
  }

  /**
   * Orchestrates the rendering of a single frame.
   */
  private renderFrame() {
    if (!this.ctx) {
      // Graphics context missing, cannot render frame
      return;
    }
    
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.ctx.save();
    this.applyViewTransformations();
    this.drawGalaxyBackground();
    this.drawStars();
    this.ctx.restore();
  }

  /**
   * Applies global coordinate transformations (center, rotate, scale).
   */
  private applyViewTransformations() {
    if (!this.ctx) {
      // Graphics context missing, cannot apply transformations
      return;
    }
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.currentRotation);
    this.ctx.scale(this.currentScale, this.currentScale);
  }

  /**
   * Draws the background galaxy image if loaded.
   * Scales it to cover the entire canvas.
   */
  private drawGalaxyBackground() {
    if (!this.ctx || !this.galaxyImage || !this.galaxyImage.complete || this.galaxyImage.naturalWidth === 0) {
      // Assets not fully loaded or context missing, skip background rendering
      return;
    }
    
    const scaleFactor = Math.max(
      this.width / this.galaxyImage.naturalWidth, 
      this.height / this.galaxyImage.naturalHeight
    );
    const drawWidth = this.galaxyImage.naturalWidth * scaleFactor;
    const drawHeight = this.galaxyImage.naturalHeight * scaleFactor;
    
    this.ctx.drawImage(
      this.galaxyImage, 
      -drawWidth / 2, 
      -drawHeight / 2, 
      drawWidth, 
      drawHeight
    );
  }

  /**
   * Updates and renders both ambient and shooting stars.
   */
  private drawStars() {
    if (!this.ctx || !this.simService.isImageLoaded()) {
      // Graphics context missing or no active mission, skip rendering stars
      return;
    }

    const isMoving = this.simService.isImageLoaded();

    // Background layer: ambient stars
    for (const star of this.ambientStars) {
      if (isMoving) {
        star.update();
      }
      star.draw(this.ctx, this.width, this.currentScale, this.starTexture);
    }

    // Foreground layer: fast shooting stars with trails
    for (const star of this.shootingStars) {
      if (isMoving) {
        star.update();
      }
      star.draw(this.ctx, this.width, this.currentScale, this.starTexture);
    }
  }

  /**
   * Initializes the video recording process using the MediaRecorder API.
   * Captures the canvas stream and handles browser-specific mime types.
   */
  private startRecording() {
    const canvas = this.canvasRef.nativeElement;
    this.videoChunks = [];
    
    try {
      // Capture stream at the simulation frame rate
      const stream = (canvas as any).captureStream(FRAME_RATE);
      const mimeType = this.getSupportedMimeType();

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.setupRecorderListeners(mimeType);

      this.mediaRecorder.start();
      
      // Start duration timer
      this.simService.recordingDuration.set(0);
      this.timerInterval = setInterval(() => {
        this.simService.recordingDuration.update(d => d + 1);
      }, 1000);
      
      // Auto-stop after the configured max duration
      this.recordingTimeout = setTimeout(() => this.stopRecording(), MAX_RECORDING_SECONDS * 1000);
    } catch (e) {
      // Error occured during recorder initialization (e.g. browser permission denied)
      console.error('Error starting recording:', e);
      this.simService.recordingState.set('idle');
    }
  }

  /**
   * Identifies the best supported video mime type for the current browser.
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      'video/mp4',
      'video/webm'
    ];
    return types.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
  }

  /**
   * Attaches event listeners to the MediaRecorder for chunk collection and finalization.
   * @param mimeType The format of the recorded video.
   */
  private setupRecorderListeners(mimeType: string) {
    if (!this.mediaRecorder) {
      // Recorder not initialized, cannot attach listeners
      return;
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        // Non-empty video chunk received, store it for the final file
        this.videoChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.handleRecordingStop(mimeType);
    };
  }

  /**
   * Process the collected video chunks and triggers a file download.
   */
  private handleRecordingStop(mimeType: string) {
    const blob = new Blob(this.videoChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const extension = mimeType.includes('mp4') ? '.mp4' : '.webm';
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `starfield-simulation${extension}`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.simService.recordingState.set('idle');
    this.mediaRecorder = null;
  }

  /**
   * Stops the active recording session and clears timeouts.
   */
  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      // Recorder is active, finalize the recording and clear auto-stop timer
      this.mediaRecorder.stop();
      clearTimeout(this.recordingTimeout);
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }
  }
}

