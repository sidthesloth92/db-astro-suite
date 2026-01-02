import { SimulationService } from '../services/simulation.service';

/**
 * Shooting Star Specific Constants
 */
const SHOOTING_STAR_SPEED_MULTIPLIER = 7;
const TRAIL_LENGTH = 8;
const CENTER_SPAWN_RATIO = 0.3;

/**
 * @class ShootingStar
 * @description
 * Represents a fast-moving star that leaves a visible trail. 
 * Actively pooled to reduce garbage collection overhead.
 */
export class ShootingStar {
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
    // MAX_DEPTH is set to viewport width to keep perspective projection proportional.
    const MAX_DEPTH = this.width;

    // Centering Logic:
    // Math.random() [0, 1] -> Shifting [-0.5, 0.5] -> Scaling [-width/2, width/2].
    // This ensures stars are distributed evenly around the (0,0) center point.
    // Shooting stars are restricted to a smaller central spawn area.
    this.x = (Math.random() - 0.5) * this.width * CENTER_SPAWN_RATIO;
    this.y = (Math.random() - 0.5) * this.height * CENTER_SPAWN_RATIO;
    
    // Starting depth is at the far end of the tunnel
    this.z = MAX_DEPTH * 0.8 + Math.random() * MAX_DEPTH * 0.2;
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
