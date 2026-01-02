import { Component, AfterViewInit, Inject, PLATFORM_ID, ElementRef, ViewChild, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimulationService } from '../../services/simulation.service';

/**
 * Configuration and Asset URLs
 */
const M33_GALAXY_URL = '/Christmas_Tree_HOO_Original_full.jpg';
const TARGET_SCALE = 2.5;
const NUM_SHOOTING_STARS = 10;
const NUM_AMBIENT_STARS = 1000;
const FRAME_RATE = 60;
const MAX_RECORDING_SECONDS = 30;

/**
 * Shooting Star Specific Constants
 */
const SHOOTING_STAR_SPEED_MULTIPLIER = 7;
const SHOOTING_STAR_SPAWN_RATE = 1.5;
const TRAIL_LENGTH = 8;
const CENTER_SPAWN_RATIO = 0.3;

/**
 * @class Simulator
 * @description
 * Main simulation component responsible for rendering a dynamic starfield with a galaxy background.
 * It handles canvas-based rendering, star lifecycle management, and video recording.
 */
@Component({
  selector: 'sfg-simulator',
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
     * Ensures the simulation adapts if screen size is changed dynamically.
     */
    effect(() => {
      // Reading the signal at the top level ensures this effect tracks it as a 
      // dependency from the first run, even before the canvas context is ready.
      const dims = this.simService.canvasDimensions();
      if (this.ctx) {
        this.setupCanvasDimensions(dims);
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

    // Small delay to allow initial UI to render before heavy star generation
    setTimeout(() => {
      this.loadStarsAsync(() => this.startImageLoading());
    }, 10);

    window.addEventListener('resize', () => this.setupCanvasDimensions());
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
   * Asynchronously generates stars in batches to avoid blocking the UI thread.
   * @param callback Function to execute once all ambient stars are generated.
   */
  private loadStarsAsync(callback: () => void) {
    let starsGenerated = 0;
    const BATCH_SIZE = 50;

    const generateBatch = () => {
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
   * Initiates loading of the background galaxy image.
   */
  private startImageLoading() {
    this.simService.loadingProgress.set('Loading Image...');
    this.galaxyImage = new Image();
    this.galaxyImage.crossOrigin = 'anonymous';
    this.galaxyImage.onload = () => this.finalizeSetup();
    this.galaxyImage.onerror = () => {
      console.warn('Failed to load galaxy image. Simulation will proceed with stars only.');
      this.finalizeSetup();
    };
    this.galaxyImage.src = M33_GALAXY_URL;
  }

  /**
   * Completes the initialization process and begins the animation loop.
   */
  private finalizeSetup() {
    this.simService.loadingProgress.set('Ready');
    this.lastShootingStarSpawn = Date.now();
    this.animate();
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
    requestAnimationFrame(this.animate);
    if (!this.ctx) {
      // Canvas context not ready, skip this animation frame
      return;
    }

    this.updateGlobalState();
    this.handleShootingStarSpawning();
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
    if (!this.ctx || !this.galaxyImage || !this.galaxyImage.complete) {
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
    if (!this.ctx) {
      // Graphics context missing, cannot draw stars
      return;
    }

    // Background layer: flickering ambient stars
    for (const star of this.ambientStars) {
      star.update();
      star.draw(this.ctx, this.width, this.currentScale, this.starTexture);
    }

    // Foreground layer: fast shooting stars with trails
    for (const star of this.shootingStars) {
      star.update();
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
    }
  }
}

/**
 * @class AmbientStar
 * @description
 * Represents a standard background star that flickers and moves slowly towards the viewer.
 */
class AmbientStar {
  x = 0; // X position in 3D space
  y = 0; // Y position in 3D space
  z = 0; // Z position in 3D space (depth)
  initialZ = 0;
  flickerOffset = 0;
  flickerRate = 0;

  constructor(
    private width: number, 
    private height: number,
    private simService: SimulationService
  ) {
    this.reset();
    this.flickerOffset = Math.random() * 0.5 + 0.5;
    this.flickerRate = Math.random() * 0.05 + 0.01;
  }

  /**
   * Resets the star to a new random 3D position at a distance.
   */
  reset() {
    this.x = (Math.random() - 0.5) * this.width;
    this.y = (Math.random() - 0.5) * this.height;
    this.z = Math.random() * this.width;
    this.initialZ = this.z;
  }

  /**
   * Updates the depth and flickering state of the star.
   */
  update() {
    const speed = this.simService.controls.ambientStarSpeed();
    this.z -= speed;
    
    // Recycle the star if it's passed behind the camera
    if (this.z <= 0) {
      // Star has passed behind the observer, wrap it back to the far distance
      this.reset();
    }
    
    // Smooth flickering using a sine wave
    this.flickerOffset = 0.5 + 0.5 * Math.sin(Date.now() * this.flickerRate * 0.001);
  }

  /**
   * Projects the 3D position to 2D canvas coordinates and renders the star.
   */
  draw(ctx: CanvasRenderingContext2D, width: number, currentScale: number, sprite: HTMLCanvasElement | null) {
    // 3D to 2D projection factor (Perspective projection)
    const k = width / this.z;
    const px = this.x * k;
    const py = this.y * k;
    
    // Calculate size and opacity based on proximity (Parallax)
    const baseSizeParallax = 1 - this.z / this.initialZ;
    const opacity = baseSizeParallax;
    const scaleCompensation = 1 / currentScale;
    
    const radius = baseSizeParallax * this.simService.controls.baseStarSize() * scaleCompensation * this.flickerOffset * 0.5;
    const effectiveAlpha = Math.min(1.0, opacity * this.flickerOffset * 2.5);

    if (radius > 0.1) {
      // Star is large enough to be visible on screen
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow effect
      ctx.globalAlpha = effectiveAlpha;
      
      if (sprite) {
        // Glow texture available, use high-performance sprite rendering
        const size = radius * 8;
        ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size);
      } else {
        // Fallback to basic arc drawing for simple circles
        ctx.fillStyle = `rgba(255, 255, 255, ${effectiveAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

/**
 * @class ShootingStar
 * @description
 * Represents a fast-moving star that leaves a visible trail. 
 * Actively pooled to reduce garbage collection overhead.
 */
class ShootingStar {
  x = 0;
  y = 0;
  z = 0;
  initialZ = 0;
  isActive = false;
  trail: { x: number; y: number; z: number }[] = [];

  constructor(
    private width: number, 
    private height: number,
    private simService: SimulationService
  ) {}

  /**
   * Spawns the star at a random location near the center of the viewport.
   */
  spawn() {
    this.x = (Math.random() - 0.5) * this.width * CENTER_SPAWN_RATIO;
    this.y = (Math.random() - 0.5) * this.height * CENTER_SPAWN_RATIO;
    this.z = this.width * 0.8 + Math.random() * this.width * 0.2;
    this.initialZ = this.z;
    this.trail = [];
    this.isActive = true;
  }

  /**
   * Updates position, moves the star very fast, and manages the trail history.
   */
  update() {
    if (!this.isActive) {
      // Star is currently in the inactive pool, skip update
      return;
    }

    // Capture current position for the trail before movement
    this.trail.unshift({ x: this.x, y: this.y, z: this.z });
    if (this.trail.length > TRAIL_LENGTH) {
      // Trail length exceeds limit, remove oldest segment to maintain length
      this.trail.pop();
    }

    // Move at a higher relative speed
    const baseSpeed = this.simService.controls.shootingStarSpeed();
    const speed = baseSpeed * SHOOTING_STAR_SPEED_MULTIPLIER;
    this.z -= speed;

    // Deactivate when it passes the camera plane
    if (this.z <= 10) {
      // Shooting star reached viewer, deactivate it and return to pool
      this.isActive = false;
      this.trail = [];
    }
  }

  /**
   * Renders the shooting star's trail and head.
   */
  draw(ctx: CanvasRenderingContext2D, width: number, currentScale: number, sprite: HTMLCanvasElement | null) {
    if (!this.isActive) {
      // Star is inactive, skip drawing
      return;
    }

    const scaleCompensation = 1 / currentScale;
    const baseSize = this.simService.controls.baseStarSize();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    this.drawTrail(ctx, width, scaleCompensation, baseSize, sprite);
    this.drawHead(ctx, width, scaleCompensation, baseSize, sprite);

    ctx.restore();
  }

  /**
   * Renders the fading segments of the star's trail.
   */
  private drawTrail(ctx: CanvasRenderingContext2D, width: number, scaleCompensation: number, baseSize: number, sprite: HTMLCanvasElement | null) {
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      if (t.z <= 0) {
        // Trail segment is behind the observer camera, skip it
        continue;
      }

      const k = width / t.z;
      const px = t.x * k;
      const py = t.y * k;
      const baseSizeParallax = 1 - t.z / this.initialZ;
      const trailOpacity = (1 - i / this.trail.length) * 0.6;
      const radius = baseSizeParallax * baseSize * scaleCompensation * 0.25;

      if (radius > 0.1) {
        // Trail segment visible, draw its fading trail point
        ctx.globalAlpha = trailOpacity;
        this.renderStarGraphic(ctx, px, py, radius, 4, trailOpacity, sprite);
      }
    }
  }

  /**
   * Renders the bright "head" of the shooting star.
   */
  private drawHead(ctx: CanvasRenderingContext2D, width: number, scaleCompensation: number, baseSize: number, sprite: HTMLCanvasElement | null) {
    if (this.z <= 0) {
      // Head is behind observer, cannot project to 2D
      return;
    }

    const k = width / this.z;
    const px = this.x * k;
    const py = this.y * k;
    const baseSizeParallax = 1 - this.z / this.initialZ;
    const radius = baseSizeParallax * baseSize * scaleCompensation * 0.5;

    if (radius > 0.1) {
      // Head visible, draw main star graphic
      ctx.globalAlpha = 1.0;
      this.renderStarGraphic(ctx, px, py, radius, 6, 1.0, sprite);
    }
  }

  /**
   * Internal helper to draw either the texture sprite or a basic arc.
   */
  private renderStarGraphic(
    ctx: CanvasRenderingContext2D, 
    x: number, y: number, 
    radius: number, 
    spriteMultiplier: number, 
    alpha: number, 
    sprite: HTMLCanvasElement | null
  ) {
    if (sprite) {
      // Using pre-rendered texture for better visuals and performance
      const size = radius * spriteMultiplier;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    } else {
      // Texture fallback - simple circle for basic environments
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
