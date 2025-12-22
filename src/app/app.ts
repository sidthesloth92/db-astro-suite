import { Component, signal, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ControlPanel } from './components/control-panel/control-panel';
import { Simulator } from './components/simulator/simulator';

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    ZOOM_RATE: number;
    ROTATION_RATE: number;
    STREAKING_STAR_SPEED: number;
    NON_STREAKING_STAR_SPEED: number;
    BASE_STAR_SIZE: number;
  }
}

// ====================================================================
// --- ADJUSTABLE SCENE CONSTANTS ---
// ====================================================================
const M33_GALAXY_URL =
  '/Chrismas_Tree_HOO_16_9_full.jpg';
const STAR_SPRITE_URL = ''; // Removed sprite URL


const TARGET_SCALE = 2.5; // Final scale (zoomed in further)

// Initialize global variables
window.ZOOM_RATE = 0.0004;
window.ROTATION_RATE = 0.0001;
window.STREAKING_STAR_SPEED = 1;
window.NON_STREAKING_STAR_SPEED = 1;
window.BASE_STAR_SIZE = 10;

const NUM_STREAKING_STARS = 500;
const NUM_NON_STREAKING_STARS = 1000;
const TOTAL_STAR_COUNT = NUM_STREAKING_STARS + NUM_NON_STREAKING_STARS;
const STREAKING_GLOW_MULTIPLIER = 3;
const AMBIENT_STAR_GLOW_MULTIPLIER = 1.0;

// Video Recording Variables
const MAX_RECORDING_SECONDS = 15;
const FRAME_RATE = 60;

@Component({
  selector: 'sfg-root',
  imports: [ControlPanel, Simulator],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit {
  protected readonly title = signal('starfield-generator');

  private galaxyImage: HTMLImageElement | null = null;
  private simulationWrapper: HTMLElement | null = null;

  private canvas: HTMLCanvasElement | null = null;
  private loadingOverlay: HTMLElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private recordButton: HTMLButtonElement | null = null;

  private width = 0;
  private height = 0;
  private centerX = 0;
  private centerY = 0;
  private currentScale = 1.0;
  private currentRotation = 0;
  private stars: Star[] = [];

  private isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private videoChunks: Blob[] = [];
  private recordingTimeout: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.init();
    }
  }

  private init() {
    this.simulationWrapper = document.querySelector('.simulation-wrapper');
    this.canvas = document.getElementById('star-canvas') as HTMLCanvasElement;
    this.loadingOverlay = document.querySelector('.loading-overlay');
    this.recordButton = document.getElementById('recordButton') as HTMLButtonElement;

    if (!this.canvas || !this.simulationWrapper) {
      console.error('Canvas or wrapper not found');
      return;
    }

    this.ctx = this.canvas.getContext('2d');

    // 1. Set initial canvas dimensions
    this.setupCanvasDimensions();

    // 2. Show Loading State
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove('hidden');
      const progressText = document.getElementById('loading-progress');
      if (progressText) progressText.textContent = 'Initializing...';
    }

    // 3. Defer Heavy Lifting
    setTimeout(() => {
      this.loadStarsAsync(() => this.startImageLoading());
    }, 10);
  }

  private setupCanvasDimensions = () => {
    if (!this.canvas) return;

    // Fixed resolution for high-quality export
    this.width = 1080;
    this.height = 1920;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
  };

  private loadStarsAsync(callback: () => void) {
    const BATCH_SIZE = 50;
    let starsGenerated = this.stars.length;

    const generateBatch = () => {
      const targetCount = Math.min(TOTAL_STAR_COUNT, starsGenerated + BATCH_SIZE);

      while (starsGenerated < targetCount) {
        const isStreaking = starsGenerated < NUM_STREAKING_STARS;
        this.stars.push(new Star(isStreaking, this.width, this.height));
        starsGenerated++;
      }

      const progressText = document.getElementById('loading-progress');
      if (progressText) {
        const percentage = Math.floor((starsGenerated / TOTAL_STAR_COUNT) * 100);
        progressText.textContent = `Generating Stars: ${percentage}%`;
      }

      if (starsGenerated < TOTAL_STAR_COUNT) {
        requestAnimationFrame(generateBatch);
      } else {
        callback();
      }
    };

    generateBatch();
  }

  private startImageLoading() {
    const progressText = document.getElementById('loading-progress');
    if (progressText) {
      progressText.textContent = `Loading Assets...`;
    }

    let assetsToLoad = 1; // Only Galaxy image now
    let assetsLoaded = 0;


    const assetLoaded = (assetName: string) => {
      assetsLoaded++;
      if (progressText) {
        progressText.textContent = `Loading Assets: ${assetName} complete (${assetsLoaded}/${assetsToLoad})`;
      }
      if (assetsLoaded === assetsToLoad) {
        this.finalizeSetup();
      }
    };

    this.galaxyImage = new Image();
    this.galaxyImage.crossOrigin = 'anonymous';
    this.galaxyImage.onload = () => assetLoaded('Galaxy');
    this.galaxyImage.onerror = () => {
      console.warn('Failed to load galaxy image. Proceeding with a black background.');
      assetLoaded('Galaxy (Failed)');
    };
    this.galaxyImage.src = M33_GALAXY_URL;

    // Removed star sprite loading logic

  }

  private starTexture: HTMLCanvasElement | null = null;

  private generateStarTexture() {
    const size = 128; // Larger texture for better quality
    const half = size / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create a radial gradient to mimic the "glowing orb" look
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');       // Hot white center
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 1)');     // Larger solid core
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');   // Brighter inner glow
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');   // More visible outer glow
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');       // Transparent edge


    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    this.starTexture = canvas;
  }


  private finalizeSetup() {
    this.generateStarTexture(); // Generate the texture before starting
    this.setupControls();
    this.setupRecorder();

    window.addEventListener('resize', this.setupCanvasDimensions);

    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add('opacity-0');
      setTimeout(() => {
        if (this.loadingOverlay) {
          this.loadingOverlay.classList.add('hidden');
          this.loadingOverlay.classList.remove('opacity-0');
        }
      }, 500);
    }

    this.animate();
  }

  private setupControls() {
    const controls = [
      { id: 'zoomRateInput', varName: 'ZOOM_RATE', displayId: 'zoomRateValue' },
      { id: 'rotationRateInput', varName: 'ROTATION_RATE', displayId: 'rotationRateValue' },
      {
        id: 'streakingSpeedInput',
        varName: 'STREAKING_STAR_SPEED',
        displayId: 'streakingSpeedValue',
      },
      {
        id: 'nonStreakingSpeedInput',
        varName: 'NON_STREAKING_STAR_SPEED',
        displayId: 'nonStreakingSpeedValue',
      },
      { id: 'baseStarSizeInput', varName: 'BASE_STAR_SIZE', displayId: 'baseStarSizeValue' },
    ];

    controls.forEach((control) => {
      const input = document.getElementById(control.id) as HTMLInputElement;
      const display = document.getElementById(control.displayId);

      if (input && display) {
        const updateHandler = () => {
          const value = parseFloat(input.value);
          (window as any)[control.varName] = value;
          const precision = control.varName.includes('RATE')
            ? 4
            : control.varName === 'BASE_STAR_SIZE'
            ? 1
            : 1;
          display.textContent = value.toFixed(precision);
        };

        input.value = String((window as any)[control.varName]);
        updateHandler();

        input.addEventListener('input', updateHandler);
      }
    });

    this.currentRotation = window.ROTATION_RATE;
    this.currentScale = 1.0; // Start filling the screen
  }

  private setupRecorder() {
    this.updateRecordButton('idle');

    if (this.recordButton) {
      this.recordButton.addEventListener('click', () => {
        if (this.isRecording) {
          this.stopRecording();
        } else {
          this.startRecording();
        }
      });
    }
  }

  private updateRecordButton(state: 'idle' | 'recording' | 'processing') {
    if (!this.recordButton) return;

    this.recordButton.classList.remove(
      'bg-red-600',
      'bg-red-800',
      'bg-accent-blue',
      'bg-blue-800',
      'bg-gray-600',
      'cursor-not-allowed',
      'animate-pulse'
    );
    this.recordButton.disabled = false;

    if (state === 'recording') {
      this.recordButton.textContent = `Recording... (${MAX_RECORDING_SECONDS}s max)`;
      this.recordButton.classList.add('bg-red-600', 'hover:bg-red-800', 'animate-pulse');
    } else if (state === 'processing') {
      this.recordButton.textContent = 'Processing Video...';
      this.recordButton.classList.add('bg-gray-600', 'cursor-not-allowed');
      this.recordButton.disabled = true;
    } else {
      this.recordButton.textContent = `Start Recording (Max ${MAX_RECORDING_SECONDS}s)`;
      this.recordButton.classList.add('bg-accent-blue', 'hover:bg-blue-800');
    }
  }

  private startRecording() {
    if (!this.canvas) return;

    if (!('captureStream' in this.canvas) || !('MediaRecorder' in window)) {
      console.error('Recording not supported in this browser.');
      if (this.recordButton) {
        this.recordButton.textContent = 'Recording Not Supported';
        this.recordButton.classList.add('bg-gray-600', 'cursor-not-allowed');
        this.recordButton.disabled = true;
      }
      return;
    }

    this.isRecording = true;
    this.videoChunks = [];

    try {
      const stream = (this.canvas as any).captureStream(FRAME_RATE);
      let mimeType = 'video/webm';

      // Prioritize H.264 for better compatibility with Mac/iPhone
      if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')) {
        mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
      } else if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.4d002a"')) {
        mimeType = 'video/mp4; codecs="avc1.4d002a"';
      } else if (MediaRecorder.isTypeSupported('video/mp4; codecs="h264"')) {
        mimeType = 'video/mp4; codecs="h264"';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
        mimeType = 'video/webm; codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
        mimeType = 'video/webm; codecs=vp8';
      }

      console.log(`Using MIME Type: ${mimeType}`);

      this.mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.videoChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder Error:', e);
        this.isRecording = false;
        this.updateRecordButton('idle');
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        this.updateRecordButton('processing');

        const fileExtension = mimeType.includes('mp4') ? '.mp4' : '.webm';
        const blob = new Blob(this.videoChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `galaxy-approach-simulation${fileExtension}`;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        this.updateRecordButton('idle');
      };

      this.mediaRecorder.start();
      this.updateRecordButton('recording');

      this.recordingTimeout = setTimeout(() => {
        if (this.isRecording) {
          this.stopRecording();
        }
        clearTimeout(this.recordingTimeout);
      }, MAX_RECORDING_SECONDS * 1000);
    } catch (e) {
      console.error('Error setting up MediaRecorder:', e);
      this.isRecording = false;
      this.updateRecordButton('idle');
    }
  }

  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      clearTimeout(this.recordingTimeout);
    }
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    if (!this.ctx || !this.canvas) return;

    // 1. Update Rotation and Scale
    this.currentRotation += window.ROTATION_RATE;

    if (this.currentScale < TARGET_SCALE) {
      this.currentScale += window.ZOOM_RATE;
    }

    if (this.currentScale >= TARGET_SCALE) {
      this.currentScale = 1.0;
    }

    // 2. Clear the canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // --- Apply Canvas Transformations ---
    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.currentRotation);
    this.ctx.scale(this.currentScale, this.currentScale);

    // 3. Draw Galaxy Image
    if (this.galaxyImage && this.galaxyImage.complete) {
      const imageWidth = this.galaxyImage.naturalWidth || this.galaxyImage.width;
      const imageHeight = this.galaxyImage.naturalHeight || this.galaxyImage.height;

      const scaleFactor = Math.max(this.width / imageWidth, this.height / imageHeight);

      const drawWidth = imageWidth * scaleFactor;
      const drawHeight = imageHeight * scaleFactor;

      const drawX = -(drawWidth / 2);
      const drawY = -(drawHeight / 2);

      this.ctx.drawImage(this.galaxyImage, drawX, drawY, drawWidth, drawHeight);
    }

    // 4. Animate and Draw Stars
    for (let i = 0; i < TOTAL_STAR_COUNT; i++) {
      if (this.stars[i]) {
        this.stars[i].update();
          // Pass the generated texture instead of the sprite image
          this.stars[i].draw(this.ctx, this.width, this.currentScale, this.starTexture);

      }
    }

    this.ctx.restore();
  };
}

class Star {
  x = 0;
  y = 0;
  z = 0;
  initialZ = 0;
  color = '';
  flickerOffset = 0;
  flickerRate = 0;

  constructor(public isStreaking: boolean, private width: number, private height: number) {
    this.reset();
    this.flickerOffset = Math.random() * 0.5 + 0.5;
    this.flickerRate = Math.random() * 0.05 + 0.01;
  }

  reset(isStreaking?: boolean) {
    this.x = (Math.random() - 0.5) * this.width;
    this.y = (Math.random() - 0.5) * this.height;
    this.z = Math.random() * this.width;
    this.initialZ = this.z;
    this.color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`;
  }

  update() {
    const speed = this.isStreaking
      ? window.STREAKING_STAR_SPEED
      : window.NON_STREAKING_STAR_SPEED;

    this.z -= speed;

    if (this.z <= 0) {
      this.reset(this.isStreaking);
    }

    if (!this.isStreaking) {
      this.flickerOffset = 0.5 + 0.5 * Math.sin(Date.now() * this.flickerRate * 0.001);
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    currentScale: number,
    sprite: HTMLCanvasElement | null

  ) {
    const k = width / this.z;
    const px = this.x * k;
    const py = this.y * k;

    const baseSizeParallax = 1 - this.z / this.initialZ;
    const opacity = baseSizeParallax;
    const scaleCompensation = 1 / currentScale;

    const calculatedRadius =
      baseSizeParallax * window.BASE_STAR_SIZE * scaleCompensation * this.flickerOffset * 0.5;

    const radius = calculatedRadius;
    // Smoothly fade in alpha from 0 based on opacity (parallax) to prevent popping
    const effectiveAlpha = Math.min(1.0, opacity * this.flickerOffset * 2.5);

    if (radius > 0.1) {
      ctx.save(); // Save state to apply composite operation
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = effectiveAlpha;

      if (sprite) {
        // Draw using the generated texture
        // We use a larger multiplier for the glow effect
        const size = radius * 8;
        ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size);
      } else {
        // Fallback
        ctx.fillStyle = `rgba(255, 255, 255, ${effectiveAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore(); // Restore state (resets globalAlpha and compositeOperation)
    }

    ctx.globalAlpha = 1.0;
  }
}
