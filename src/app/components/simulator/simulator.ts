import { Component, AfterViewInit, ElementRef, ViewChild, effect } from '@angular/core';
import { SimulationService } from '../../services/simulation.service';
import { HudOverlay } from './hud-overlay/hud-overlay';
import { LoadingOverlay } from './loading-overlay/loading-overlay';
import { ImageUpload } from './image-upload/image-upload';
import { ClearImageButton } from './clear-image-button/clear-image-button';

const TARGET_SCALE = 2.5;
const SHOOTING_STAR_SPAWN_RATE = 1.5;

/**
 * @class Simulator
 * @description
 * Main simulation component responsible for rendering a dynamic starfield with a galaxy background.
 * Delegates state management to SimulationService and focuses on canvas rendering.
 */
@Component({
  selector: 'sw-simulator',
  templateUrl: './simulator.html',
  styleUrl: './simulator.css',
  standalone: true,
  imports: [HudOverlay, LoadingOverlay, ImageUpload, ClearImageButton],
})
export class Simulator implements AfterViewInit {
  @ViewChild('starCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // Rendering State
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private centerX = 0;
  private centerY = 0;
  private currentScale = 1.0;
  private currentRotation = 0;
  private starTexture: HTMLCanvasElement | null = null;
  private lastShootingStarSpawn = 0;
  private animationFrameId: number | null = null;

  constructor(public simService: SimulationService) {
    // Effect to respond to recording state changes
    effect(() => {
      const state = this.simService.recordingState();
      if (state === 'recording' && !this.simService.isRecording()) {
        this.simService.startRecording(this.canvasRef.nativeElement);
      } else if (state === 'idle' && this.simService.isRecording()) {
        this.simService.stopRecording();
      }
    });

    // Effect to respond to canvas dimension changes
    effect(() => {
      const dims = this.simService.canvasDimensions();
      if (this.ctx) {
        this.setupCanvasDimensions(dims);
        this.resetSimulation();
      }
    });
  }

  ngAfterViewInit() {
    this.init();
  }

  private init() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    this.setupCanvasDimensions();
    this.generateStarTexture();
    this.simService.loadingProgress.set('Initializing...');

    // Load default scene
    this.simService.loadDefaultScene();

    // Generate stars with small delay for UI
    setTimeout(() => {
      this.simService.loadStarsAsync(this.width, this.height, () => {
        this.simService.loadingProgress.set('Ready');
        this.lastShootingStarSpawn = Date.now();
      });
    }, 10);

    this.animate();
    window.addEventListener('resize', () => this.setupCanvasDimensions());
  }

  private setupCanvasDimensions = (overrideDims?: { width: number; height: number }) => {
    const canvas = this.canvasRef.nativeElement;
    const dims = overrideDims || this.simService.canvasDimensions();
    canvas.width = dims.width;
    canvas.height = dims.height;
    this.width = dims.width;
    this.height = dims.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
  };

  private resetSimulation() {
    this.currentScale = 1.0;
    this.currentRotation = 0;
    this.simService.resetStars();
    this.simService.loadingProgress.set('Re-initializing...');

    this.simService.loadStarsAsync(this.width, this.height, () => {
      this.simService.loadingProgress.set('Ready');
    });
  }

  handleImageUpload(event: Event) {
    this.simService.handleImageUpload(event);
    this.lastShootingStarSpawn = Date.now();
  }

  clearImage() {
    this.simService.clearImage();
    this.currentScale = 1.0;
    this.currentRotation = 0;
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
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.ctx) return;

    if (this.simService.isImageLoaded()) {
      this.updateGlobalState();
      this.handleShootingStarSpawning();
    }

    this.renderFrame();
  };

  private updateGlobalState() {
    this.currentRotation += this.simService.controls.rotationRate();

    if (this.currentScale < TARGET_SCALE) {
      this.currentScale += this.simService.controls.zoomRate();
    } else {
      this.currentScale = 1.0;
    }
  }

  private handleShootingStarSpawning() {
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
      this.height / galaxyImage.naturalHeight
    );
    const drawWidth = galaxyImage.naturalWidth * scaleFactor;
    const drawHeight = galaxyImage.naturalHeight * scaleFactor;

    this.ctx.drawImage(galaxyImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  }

  private drawStars() {
    if (!this.ctx || !this.simService.isImageLoaded()) return;

    const isMoving = this.simService.isImageLoaded();

    for (const star of this.simService.ambientStars()) {
      if (isMoving) star.update();
      star.draw(this.ctx, this.width, this.currentScale, this.starTexture);
    }

    for (const star of this.simService.shootingStars()) {
      if (isMoving) star.update();
      star.draw(this.ctx, this.width, this.currentScale, this.starTexture);
    }
  }
}
