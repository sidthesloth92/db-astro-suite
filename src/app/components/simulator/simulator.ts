import { Component, AfterViewInit, Inject, PLATFORM_ID, ElementRef, ViewChild, signal, effect } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { SimulationService } from '../../services/simulation.service';

const M33_GALAXY_URL = '/Christmas_Tree_HOO_Original_full.jpg';
const TARGET_SCALE = 2.5;
const NUM_SHOOTING_STARS = 10; // Reduced for dramatic effect
const NUM_AMBIENT_STARS = 1000;
const FRAME_RATE = 60;
const MAX_RECORDING_SECONDS = 30;

// Shooting star config
const SHOOTING_STAR_SPEED_MULTIPLIER = 7; // Faster than ambient but not too fast
const SHOOTING_STAR_SPAWN_RATE = 1.5; // Stars per second
const TRAIL_LENGTH = 8; // Number of trail segments
const CENTER_SPAWN_RATIO = 0.3; // Spawn within ±30% of center

@Component({
  selector: 'sfg-simulator',
  templateUrl: './simulator.html',
  styleUrl: './simulator.css',
  standalone: true,
  imports: [CommonModule],
})
export class Simulator implements AfterViewInit {
  @ViewChild('starCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private galaxyImage: HTMLImageElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private centerX = 0;
  private centerY = 0;
  private currentScale = 1.0;
  private currentRotation = 0;
  private ambientStars: AmbientStar[] = [];
  private shootingStars: ShootingStar[] = [];
  private starTexture: HTMLCanvasElement | null = null;
  private lastShootingStarSpawn = 0;

  // Recording variables
  private mediaRecorder: MediaRecorder | null = null;
  private videoChunks: Blob[] = [];
  private recordingTimeout: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public simService: SimulationService
  ) {
    // React to recording state changes from the service
    effect(() => {
      const state = this.simService.recordingState();
      if (state === 'recording' && !this.mediaRecorder) {
        this.startRecording();
      } else if (state === 'idle' && this.mediaRecorder?.state === 'recording') {
        this.stopRecording();
      }
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.init();
    }
  }

  private init() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    
    this.setupCanvasDimensions();
    this.simService.loadingProgress.set('Initializing...');

    setTimeout(() => {
      this.loadStarsAsync(() => this.startImageLoading());
    }, 10);

    window.addEventListener('resize', this.setupCanvasDimensions);
  }

  private setupCanvasDimensions = () => {
    const canvas = this.canvasRef.nativeElement;
    this.width = 1080;
    this.height = 1920;
    canvas.width = this.width;
    canvas.height = this.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
  };

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
        requestAnimationFrame(generateBatch);
      } else {
        // Initialize a few shooting stars
        for (let i = 0; i < NUM_SHOOTING_STARS; i++) {
          this.shootingStars.push(new ShootingStar(this.width, this.height, this.simService));
        }
        callback();
      }
    };
    generateBatch();
  }

  private startImageLoading() {
    this.simService.loadingProgress.set('Loading Assets...');
    this.galaxyImage = new Image();
    this.galaxyImage.crossOrigin = 'anonymous';
    this.galaxyImage.onload = () => this.finalizeSetup();
    this.galaxyImage.onerror = () => {
      console.warn('Failed to load galaxy image.');
      this.finalizeSetup();
    };
    this.galaxyImage.src = M33_GALAXY_URL;
  }

  private finalizeSetup() {
    this.generateStarTexture();
    this.simService.loadingProgress.set('Ready');
    this.lastShootingStarSpawn = Date.now();
    this.animate();
  }

  private generateStarTexture() {
    const size = 128;
    const half = size / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

  private animate = () => {
    requestAnimationFrame(this.animate);
    if (!this.ctx) return;

    this.currentRotation += this.simService.controls.rotationRate();
    if (this.currentScale < TARGET_SCALE) {
      this.currentScale += this.simService.controls.zoomRate();
    } else {
      this.currentScale = 1.0;
    }

    // Spawn new shooting stars periodically
    const now = Date.now();
    const timeSinceLastSpawn = (now - this.lastShootingStarSpawn) / 1000;
    if (timeSinceLastSpawn > (1 / SHOOTING_STAR_SPAWN_RATE)) {
      // Find a dead shooting star and respawn it
      for (const star of this.shootingStars) {
        if (!star.isActive) {
          star.spawn();
          this.lastShootingStarSpawn = now;
          break;
        }
      }
    }

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.currentRotation);
    this.ctx.scale(this.currentScale, this.currentScale);

    if (this.galaxyImage && this.galaxyImage.complete) {
      const scaleFactor = Math.max(this.width / this.galaxyImage.naturalWidth, this.height / this.galaxyImage.naturalHeight);
      const drawWidth = this.galaxyImage.naturalWidth * scaleFactor;
      const drawHeight = this.galaxyImage.naturalHeight * scaleFactor;
      this.ctx.drawImage(this.galaxyImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    }

    // Draw ambient stars first (background layer)
    for (const star of this.ambientStars) {
      star.update();
      star.draw(this.ctx, this.width, this.currentScale, this.starTexture);
    }

    // Draw shooting stars on top with trails
    for (const star of this.shootingStars) {
      star.update();
      star.draw(this.ctx, this.width, this.currentScale, this.starTexture);
    }

    this.ctx.restore();
  };

  private startRecording() {
    const canvas = this.canvasRef.nativeElement;
    this.videoChunks = [];
    try {
      const stream = (canvas as any).captureStream(FRAME_RATE);
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')) mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
      else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.videoChunks.push(e.data); };
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.videoChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `starfield-simulation${mimeType.includes('mp4') ? '.mp4' : '.webm'}`;
        a.click();
        URL.revokeObjectURL(url);
        this.simService.recordingState.set('idle');
        this.mediaRecorder = null;
      };

      this.mediaRecorder.start();
      this.recordingTimeout = setTimeout(() => this.stopRecording(), MAX_RECORDING_SECONDS * 1000);
    } catch (e) {
      console.error('Error starting recording:', e);
      this.simService.recordingState.set('idle');
    }
  }

  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      clearTimeout(this.recordingTimeout);
    }
  }
}

// Ambient background stars (slow, flickering)
class AmbientStar {
  x = 0;
  y = 0;
  z = 0;
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

  reset() {
    this.x = (Math.random() - 0.5) * this.width;
    this.y = (Math.random() - 0.5) * this.height;
    this.z = Math.random() * this.width;
    this.initialZ = this.z;
  }

  update() {
    const speed = this.simService.controls.ambientStarSpeed();
    this.z -= speed;
    if (this.z <= 0) this.reset();
    this.flickerOffset = 0.5 + 0.5 * Math.sin(Date.now() * this.flickerRate * 0.001);
  }

  draw(ctx: CanvasRenderingContext2D, width: number, currentScale: number, sprite: HTMLCanvasElement | null) {
    const k = width / this.z;
    const px = this.x * k;
    const py = this.y * k;
    const baseSizeParallax = 1 - this.z / this.initialZ;
    const opacity = baseSizeParallax;
    const scaleCompensation = 1 / currentScale;
    const radius = baseSizeParallax * this.simService.controls.baseStarSize() * scaleCompensation * this.flickerOffset * 0.5;
    const effectiveAlpha = Math.min(1.0, opacity * this.flickerOffset * 2.5);

    if (radius > 0.1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = effectiveAlpha;
      if (sprite) {
        const size = radius * 8;
        ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size);
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${effectiveAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

// Dramatic shooting stars with trails
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
  ) {
    // Start inactive - will spawn periodically
    this.isActive = false;
  }

  spawn() {
    // Spawn closer to center for more visibility
    this.x = (Math.random() - 0.5) * this.width * CENTER_SPAWN_RATIO;
    this.y = (Math.random() - 0.5) * this.height * CENTER_SPAWN_RATIO;
    this.z = this.width * 0.8 + Math.random() * this.width * 0.2; // Start far away
    this.initialZ = this.z;
    this.trail = [];
    this.isActive = true;
  }

  update() {
    if (!this.isActive) return;

    // Store current position in trail before moving
    this.trail.unshift({ x: this.x, y: this.y, z: this.z });
    if (this.trail.length > TRAIL_LENGTH) {
      this.trail.pop();
    }

    // Move very fast
    const baseSpeed = this.simService.controls.shootingStarSpeed();
    const speed = baseSpeed * SHOOTING_STAR_SPEED_MULTIPLIER;
    this.z -= speed;

    // Deactivate when it passes the camera
    if (this.z <= 10) {
      this.isActive = false;
      this.trail = [];
    }
  }

  draw(ctx: CanvasRenderingContext2D, width: number, currentScale: number, sprite: HTMLCanvasElement | null) {
    if (!this.isActive) return;

    const scaleCompensation = 1 / currentScale;
    const baseSize = this.simService.controls.baseStarSize();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Draw trail (fading segments)
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      if (t.z <= 0) continue;

      const k = width / t.z;
      const px = t.x * k;
      const py = t.y * k;
      const baseSizeParallax = 1 - t.z / this.initialZ;
      const trailOpacity = (1 - i / this.trail.length) * 0.6; // Fade out along trail
      const radius = baseSizeParallax * baseSize * scaleCompensation * 0.25;

      if (radius > 0.1) {
        ctx.globalAlpha = trailOpacity;
        if (sprite) {
          const size = radius * 4;
          ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size);
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${trailOpacity})`;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw head (brightest and largest)
    if (this.z > 0) {
      const k = width / this.z;
      const px = this.x * k;
      const py = this.y * k;
      const baseSizeParallax = 1 - this.z / this.initialZ;
      const radius = baseSizeParallax * baseSize * scaleCompensation * 0.5;

      if (radius > 0.1) {
        ctx.globalAlpha = 1.0;
        if (sprite) {
          const size = radius * 6;
          ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size);
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 1)';
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }
}
