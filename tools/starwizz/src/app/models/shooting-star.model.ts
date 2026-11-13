import {
  SHOOTING_STAR_CENTER_SPAWN_RATIO,
  SHOOTING_STAR_HEAD_RADIUS_FACTOR,
  SHOOTING_STAR_HEAD_SPRITE_SCALE,
  SHOOTING_STAR_LATERAL_DEPTH_SPAN,
  SHOOTING_STAR_LATERAL_DEPTH_START,
  SHOOTING_STAR_NEAR_DEPTH,
  SHOOTING_STAR_OFFSCREEN_PADDING,
  SHOOTING_STAR_RECEDING_DEPTH_SPAN,
  SHOOTING_STAR_TRAIL_LENGTH,
} from '../constants/shooting-star.constant';
import { STAR_DEPTH_FACTOR, STAR_LATERAL_FACTOR } from '../constants/simulation.constant';
import { SimulationService } from '../services/simulation.service';
import {
  frameCircleRadius,
  isOutsideFrameCircle,
  isOutsideFrameRect,
  lateralEntryPoint,
} from '../utils/shooting-star-spawn.util';
import { StarDepth } from './simulation.model';

/**
 * @class ShootingStar
 * @description
 * Represents a fast-moving star that leaves a visible trail. A streak is always
 * born out of view (beyond the frame edge it enters from, or at the far end of
 * the tunnel where it has no size yet) and retired once it is out of view again.
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
  /** True once the streak has been inside the frame, so leaving it retires the streak. */
  private hasEnteredFrame = false;

  constructor(
    private width: number, 
    private height: number,
    private simService: SimulationService
  ) {}

  /**
   * Spawns the star out of view, positioned so its captured motion carries it
   * into the frame:
   * - approaching ('out'): at the far end of the tunnel near the vanishing
   *   point, where a star has no size yet, so it grows into view;
   * - lateral drift: beyond the frame edge it drifts in from;
   * - receding ('in') only: beyond the frame all around, streaking inward.
   */
  spawn() {
    // MAX_DEPTH is set to viewport width to keep perspective projection proportional.
    const MAX_DEPTH = this.width;

    // Capture the current (derived) motion so the streak follows the field.
    this.depth = this.simService.starDepth();
    this.lateralOn = this.simService.starLateralOn();

    if (this.lateralOn) {
      const radians = (this.simService.starDirectionDeg() * Math.PI) / 180;
      this.vx = Math.cos(radians);
      this.vy = -Math.sin(radians);
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    if (this.depth === 'out') {
      // Expand outward: start at the very back, where proximity (and so the
      // drawn size) is zero, tight around the centre so it fans outward.
      this.z = MAX_DEPTH;
      this.x = (Math.random() - 0.5) * this.z * SHOOTING_STAR_CENTER_SPAWN_RATIO;
      this.y = (Math.random() - 0.5) * this.z * SHOOTING_STAR_CENTER_SPAWN_RATIO;
    } else {
      if (this.depth === 'in') {
        // Contract inward: start near the camera and recede.
        this.z =
          SHOOTING_STAR_NEAR_DEPTH + Math.random() * MAX_DEPTH * SHOOTING_STAR_RECEDING_DEPTH_SPAN;
      } else {
        // No depth (pure lateral): mid depth.
        this.z =
          MAX_DEPTH * SHOOTING_STAR_LATERAL_DEPTH_START +
          Math.random() * MAX_DEPTH * SHOOTING_STAR_LATERAL_DEPTH_SPAN;
      }
      // A streak this close is drawn at full size, so it must start off-screen.
      const entry = this.offscreenEntryPoint();
      this.x = (entry.x * this.z) / this.width;
      this.y = (entry.y * this.z) / this.width;
    }

    this.initialZ = this.z;
    this.trail = [];
    this.hasEnteredFrame = false;
    this.isActive = true;
  }

  /**
   * Picks an off-screen entry point (projected px from the frame centre) for
   * the freshly chosen depth: on the upstream side for a lateral drift, or
   * anywhere around the frame for a purely receding streak.
   */
  private offscreenEntryPoint(): { x: number; y: number } {
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    const margin = this.glowMargin(this.z);

    if (this.lateralOn) {
      return lateralEntryPoint(
        { x: this.vx, y: this.vy },
        halfWidth,
        halfHeight,
        margin,
        Math.random() * 2 - 1,
      );
    }

    // Purely receding: the view may be rotated, so start beyond the circle
    // around the frame, which is off-screen at every rotation.
    const angle = Math.random() * Math.PI * 2;
    const radius = frameCircleRadius(halfWidth, halfHeight) + margin;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  }

  /**
   * Px to keep between the frame edge and a streak at depth `z` so its head
   * glow is fully out of view: half the glow sprite plus a small padding.
   */
  private glowMargin(z: number): number {
    const proximity = Math.max(0, 1 - z / this.width);
    const headRadius =
      proximity * this.simService.controls.baseStarSize() * SHOOTING_STAR_HEAD_RADIUS_FACTOR;
    return (headRadius * SHOOTING_STAR_HEAD_SPRITE_SCALE) / 2 + SHOOTING_STAR_OFFSCREEN_PADDING;
  }

  /**
   * Whether a world position projects fully outside the frame. Lateral drift
   * only happens with a flat view, so the frame rectangle is exact; a purely
   * radial streak can be in a rotated view, so it uses the enclosing circle.
   */
  private isOutOfView(x: number, y: number, z: number): boolean {
    const k = this.width / Math.max(0.1, z);
    const point = { x: x * k, y: y * k };
    const margin = this.glowMargin(z);
    return this.lateralOn
      ? isOutsideFrameRect(point, this.width / 2, this.height / 2, margin)
      : isOutsideFrameCircle(point, this.width / 2, this.height / 2, margin);
  }

  /**
   * Updates position along the captured motion mode, manages the trail, and
   * deactivates the star once it has crossed the frame and is out of view
   * again (head and trail), or has run out of depth.
   */
  update() {
    if (!this.isActive) {
      // Star is currently in the inactive pool, skip update
      return;
    }

    // Capture current position for the trail before movement
    this.trail.unshift({ x: this.x, y: this.y, z: this.z });
    if (this.trail.length > SHOOTING_STAR_TRAIL_LENGTH) {
      // Trail length exceeds limit, remove oldest segment to maintain length
      this.trail.pop();
    }

    // Move at a higher relative speed
    // No motion configured — retire defensively (also gated upstream by spawning).
    if (this.depth === 'none' && !this.lateralOn) {
      this.deactivate();
      return;
    }

    // Speed is a multiple of the Star Speed slider, using the same depth/lateral
    // factors as Star.update so the streak travels in the exact same direction as
    // the field — just `multiplier`× faster. Deliberately NOT the path-coupled
    // speed: streaks keep a steady, visible pace (and stay plentiful) regardless
    // of the camera glide, which already drives their direction.
    const base =
      this.simService.getInternalValue('starSpeed') * this.simService.controls.shootingStarSpeed();
    const depthStep = base * STAR_DEPTH_FACTOR;
    const lateralStep = base * STAR_LATERAL_FACTOR;
    const MAX_DEPTH = this.width;

    // Combined motion: radial depth (if any) + lateral drift (if any).
    if (this.depth === 'out') {
      this.z -= depthStep;
    } else if (this.depth === 'in') {
      this.z += depthStep;
    }
    if (this.lateralOn) {
      this.x += this.vx * lateralStep;
      this.y += this.vy * lateralStep;
    }

    // Out of depth: an approaching streak has reached the camera, or a receding
    // one has reached the far end (where it has already shrunk to nothing).
    const isOutOfDepth =
      (this.depth === 'out' && this.z <= SHOOTING_STAR_NEAR_DEPTH) ||
      (this.depth === 'in' && this.z >= MAX_DEPTH);

    // Out of view again: the head has been in the frame and has now left it,
    // and the oldest trail point has followed it out, so nothing vanishes on
    // screen. A streak still flying in from its off-screen spawn is kept.
    const isHeadOutOfView = this.isOutOfView(this.x, this.y, this.z);
    if (!isHeadOutOfView) {
      this.hasEnteredFrame = true;
    }
    const tail = this.trail[this.trail.length - 1];
    const hasLeftFrame =
      this.hasEnteredFrame && isHeadOutOfView && this.isOutOfView(tail.x, tail.y, tail.z);

    if (isOutOfDepth || hasLeftFrame) {
      this.deactivate();
    }
  }

  /** Returns the star to the inactive pool. Public so the simulator can clear
   * any in-flight streak the instant shooting stars are disabled. */
  deactivate() {
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
    const radius =
      baseSizeParallax * baseSize * scaleCompensation * SHOOTING_STAR_HEAD_RADIUS_FACTOR;

    if (radius > 0.1) {
      // Head visible, draw main star graphic
      ctx.globalAlpha = 1.0;
      this.renderStarGraphic(ctx, px, py, radius, SHOOTING_STAR_HEAD_SPRITE_SCALE, 1.0, sprite);
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
