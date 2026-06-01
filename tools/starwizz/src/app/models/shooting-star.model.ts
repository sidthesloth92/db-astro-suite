import { SimulationService } from '../services/simulation.service';
import { StarDepth } from './simulation.model';

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

  /** Depth captured at spawn so an in-flight streak isn't distorted by later changes. */
  private depth: StarDepth = 'out';
  /** Whether lateral drift is active, captured at spawn. */
  private lateralOn = false;
  /** Lateral unit direction (x, y) captured at spawn. */
  private vx = 0;
  private vy = 0;

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

    // Capture the current (derived) motion so the streak follows the field.
    this.depth = this.simService.starDepth();
    this.lateralOn = this.simService.starLateralOn();

    if (this.depth === 'in') {
      // Contract inward: start near the camera and recede.
      this.z = 10 + Math.random() * MAX_DEPTH * 0.2;
    } else if (this.depth === 'out') {
      // Expand outward: start at the far end of the tunnel.
      this.z = MAX_DEPTH * 0.8 + Math.random() * MAX_DEPTH * 0.2;
    } else {
      // No depth (pure lateral): mid depth.
      this.z = MAX_DEPTH * 0.3 + Math.random() * MAX_DEPTH * 0.3;
    }

    // Spread proportional to depth so the projected spawn sits near centre at any z.
    this.x = (Math.random() - 0.5) * this.z * CENTER_SPAWN_RATIO;
    this.y = (Math.random() - 0.5) * this.z * CENTER_SPAWN_RATIO;

    if (this.lateralOn) {
      const radians = (this.simService.starDirectionDeg() * Math.PI) / 180;
      this.vx = Math.cos(radians);
      this.vy = -Math.sin(radians);
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    this.initialZ = this.z;
    this.trail = [];
    this.isActive = true;
  }

  /**
   * Updates position along the captured motion mode, manages the trail, and
   * deactivates the star once it leaves the frame.
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
    // No motion configured — retire defensively (also gated upstream by spawning).
    if (this.depth === 'none' && !this.lateralOn) {
      this.deactivate();
      return;
    }

    const speed = this.simService.controls.shootingStarSpeed() * SHOOTING_STAR_SPEED_MULTIPLIER;
    const MAX_DEPTH = this.width;

    // Combined motion: radial depth (if any) + lateral drift (if any).
    if (this.depth === 'out') {
      this.z -= speed;
    } else if (this.depth === 'in') {
      this.z += speed;
    }
    if (this.lateralOn) {
      this.x += this.vx * speed;
      this.y += this.vy * speed;
    }

    // Deactivate when it passes a depth boundary or its projected head leaves the frame.
    const k = this.width / Math.max(0.1, this.z);
    const offScreen =
      Math.abs(this.x * k) > this.width / 2 || Math.abs(this.y * k) > this.height / 2;
    if (this.z <= 10 || this.z >= MAX_DEPTH || offScreen) {
      this.deactivate();
    }
  }

  /** Returns the star to the inactive pool. */
  private deactivate() {
    this.isActive = false;
    this.trail = [];
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
      const px = t.x * k * scaleCompensation;
      const py = t.y * k * scaleCompensation;
      const baseSizeParallax = 1 - t.z / width;
      const trailOpacity = (1 - i / this.trail.length) * 0.6;
      const radius = baseSizeParallax * baseSize * scaleCompensation * 0.2;

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
    const px = this.x * k * scaleCompensation;
    const py = this.y * k * scaleCompensation;
    const baseSizeParallax = 1 - this.z / width;
    const radius = baseSizeParallax * baseSize * scaleCompensation * 0.4;

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
