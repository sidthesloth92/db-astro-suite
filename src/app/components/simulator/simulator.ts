import { Component, AfterViewInit, Inject, PLATFORM_ID, ElementRef, ViewChild, signal, effect } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { SimulationService } from '../../services/simulation.service';

const M33_GALAXY_URL = '/Chrismas_Tree_HOO_16_9_full.jpg';
const TARGET_SCALE = 2.5;
const NUM_STREAKING_STARS = 500;
const NUM_NON_STREAKING_STARS = 1000;
const TOTAL_STAR_COUNT = NUM_STREAKING_STARS + NUM_NON_STREAKING_STARS;
const FRAME_RATE = 60;
const MAX_RECORDING_SECONDS = 15;

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
  private stars: Star[] = [];
  private starTexture: HTMLCanvasElement | null = null;

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
      const targetCount = Math.min(TOTAL_STAR_COUNT, starsGenerated + BATCH_SIZE);
      while (starsGenerated < targetCount) {
        const isStreaking = starsGenerated < NUM_STREAKING_STARS;
        this.stars.push(new Star(isStreaking, this.width, this.height, this.simService));
        starsGenerated++;
      }

      const percentage = Math.floor((starsGenerated / TOTAL_STAR_COUNT) * 100);
      this.simService.loadingProgress.set(`Generating Stars: ${percentage}%`);

      if (starsGenerated < TOTAL_STAR_COUNT) {
        requestAnimationFrame(generateBatch);
      } else {
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

    this.currentRotation += this.simService.rotationRate();
    if (this.currentScale < TARGET_SCALE) {
      this.currentScale += this.simService.zoomRate();
    } else {
      this.currentScale = 1.0;
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

    for (const star of this.stars) {
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

class Star {
  x = 0;
  y = 0;
  z = 0;
  initialZ = 0;
  flickerOffset = 0;
  flickerRate = 0;

  constructor(
    public isStreaking: boolean, 
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
    const speed = this.isStreaking ? this.simService.streakingStarSpeed() : this.simService.nonStreakingStarSpeed();
    this.z -= speed;
    if (this.z <= 0) this.reset();
    if (!this.isStreaking) {
      this.flickerOffset = 0.5 + 0.5 * Math.sin(Date.now() * this.flickerRate * 0.001);
    }
  }

  draw(ctx: CanvasRenderingContext2D, width: number, currentScale: number, sprite: HTMLCanvasElement | null) {
    const k = width / this.z;
    const px = this.x * k;
    const py = this.y * k;
    const baseSizeParallax = 1 - this.z / this.initialZ;
    const opacity = baseSizeParallax;
    const scaleCompensation = 1 / currentScale;
    const radius = baseSizeParallax * this.simService.baseStarSize() * scaleCompensation * this.flickerOffset * 0.5;
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
