import { STAR_DEPTH_FACTOR, STAR_LATERAL_FACTOR } from '../constants/simulation.constant';
import {
  MAGNITUDE_ALPHA_MIN,
  MAGNITUDE_SIZE_MAX,
  MAGNITUDE_SIZE_MIN,
  TWINKLE_SPEED,
} from '../constants/star-appearance.constant';
import { StarSprites } from './star-appearance.model';
import { SimulationService } from '../services/simulation.service';
import {
  pickWeightedColorIndex,
  randomMagnitude,
  spikeAlphaForAmount,
  spikeSizeFactorForAmount,
  spikeThresholdForAmount,
  twinkleAmplitudeForStrength,
} from '../utils/star-appearance.util';

/**
 * @class Star
 * @description
 * Represents a standard background star that moves through the field in the
 * currently selected travel direction (toward the viewer by default).
 */
export class Star {
  x = 0; // X position in 3D space (relative to center)
  y = 0; // Y position in 3D space (relative to center)
  z = 0; // Z position in 3D space (depth from camera)
  initialZ = 0;

  /** @private Palette index backing {@link colorIndex}; re-rolled via {@link rerollColor}. */
  private _colorIndex = 0;

  /** Intrinsic brightness in [0, 1] (1 = brightest) — fixed for the star's lifetime. */
  readonly magnitude = randomMagnitude();

  /** Per-star phase offset so the field never twinkles in unison. */
  private readonly twinklePhase = Math.random() * Math.PI * 2;

  constructor(
    private width: number,
    private height: number,
    private simService: SimulationService
  ) {
    this.rerollColor();
    this.reset(true);
  }

  /** Index into the star colour palette — stable until {@link rerollColor} is called. */
  get colorIndex(): number {
    return this._colorIndex;
  }

  /**
   * Re-picks the star's palette colour against the current Colorful Stars
   * ratio. Called for the whole field when the user moves that slider, since
   * colours are otherwise fixed at spawn.
   */
  rerollColor() {
    this._colorIndex = pickWeightedColorIndex(this.simService.controls.colorfulStarRatio());
  }

  /**
   * Resets the star to a new position.
   * @param useRandomDepth If true, starts at a random depth (used for initial population).
   *                       If false, starts at the far boundary (used for recycling).
   */
  reset(useRandomDepth = false) {
    // MAX_DEPTH is set to viewport width to keep perspective projection proportional.
    const MAX_DEPTH = this.width;

    this.x = (Math.random() - 0.5) * this.width;
    this.y = (Math.random() - 0.5) * this.height;
    
    // If not a random initial spawn, always start at the very back to prevent "popping"
    this.z = useRandomDepth ? Math.random() * MAX_DEPTH : MAX_DEPTH;
    this.initialZ = MAX_DEPTH;
  }

  /**
   * Moves the star one frame along the active travel direction and wraps it
   * toroidally so the field stays evenly populated in every direction.
   *
   * Forward travel (the default) reproduces the original outward warp; the
   * only difference is that recycled stars wrap rather than re-randomise,
   * which is imperceptible at the configured star counts.
   */
  update() {
    const speed = this.simService.getStarMotionSpeed();

    // Lateral drift along the A→B angle (0 = right, 90 = up), when active.
    if (this.simService.starLateralOn()) {
      const radians = (this.simService.starDirectionDeg() * Math.PI) / 180;
      const lateral = speed * STAR_LATERAL_FACTOR;
      this.x += Math.cos(radians) * lateral;
      this.y += -Math.sin(radians) * lateral;
    }

    // Radial depth — combines with the lateral drift above. Uses the depth
    // factor so it reads as strongly as the lateral drift (receding 'in'
    // motion is otherwise swamped when combined with a pan).
    const depth = this.simService.starDepth();
    const depthStep = speed * STAR_DEPTH_FACTOR;
    if (depth === 'out') {
      this.z -= depthStep;
    } else if (depth === 'in') {
      this.z += depthStep;
    }

    this.wrap();
  }

  /**
   * Wraps each axis back into the visible frustum once the star crosses a
   * boundary, keeping a constant density regardless of travel direction.
   */
  private wrap() {
    const maxDepth = this.width;
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;

    if (this.z <= 0) {
      this.z += maxDepth;
    } else if (this.z > maxDepth) {
      this.z -= maxDepth;
    }

    if (this.x < -halfWidth) {
      this.x += this.width;
    } else if (this.x > halfWidth) {
      this.x -= this.width;
    }

    if (this.y < -halfHeight) {
      this.y += this.height;
    } else if (this.y > halfHeight) {
      this.y -= this.height;
    }
  }

  /**
   * Projects the 3D position to 2D canvas coordinates and renders the star
   * with its intrinsic tint, magnitude-driven size/brightness, a gentle
   * twinkle, and diffraction spikes on the brightest stars.
   *
   * @param sprites - Pre-rendered per-colour glow/spike sprites (null falls back to plain arcs)
   * @param timeSeconds - Monotonic time in seconds driving the twinkle oscillation
   */
  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    currentScale: number,
    sprites: StarSprites | null,
    timeSeconds: number,
  ) {
    // The whole layer is drawn inside the canvas zoom transform. We cancel that
    // zoom for the stars (position AND size) so the starfield stays a constant,
    // frame-filling foreground layer — otherwise zooming in magnifies the field
    // outward and only the central few stars remain visible (looks sparse).
    const scaleCompensation = 1 / currentScale;

    // 3D to 2D projection factor (Perspective projection)
    // As z gets smaller (closer to camera), k gets larger (bigger on screen)
    const k = width / Math.max(0.1, this.z);
    const px = this.x * k * scaleCompensation;
    const py = this.y * k * scaleCompensation;

    // Proximity logic:
    // We use a fixed reference (MAX_DEPTH) so stars are visible even before they move.
    const MAX_DEPTH = width;
    const proximity = 1 - this.z / MAX_DEPTH;

    // Intrinsic appearance: magnitude drives both footprint and brightness,
    // and the twinkle gently modulates brightness around its resting value.
    const sizeFactor =
      MAGNITUDE_SIZE_MIN + (MAGNITUDE_SIZE_MAX - MAGNITUDE_SIZE_MIN) * this.magnitude;
    const magnitudeAlpha = MAGNITUDE_ALPHA_MIN + (1 - MAGNITUDE_ALPHA_MIN) * this.magnitude;
    const twinkleAmplitude = twinkleAmplitudeForStrength(
      this.simService.controls.twinkleStrength(),
    );
    const twinkle =
      1 + twinkleAmplitude * Math.sin(timeSeconds * TWINKLE_SPEED + this.twinklePhase);

    // Base size scaled by proximity and zoom compensation
    const radius =
      proximity * this.simService.controls.baseStarSize() * scaleCompensation * 0.2 * sizeFactor;
    const effectiveAlpha = Math.min(1.0, proximity * magnitudeAlpha * twinkle);

    if (radius > 0.1) {
      // Star is large enough to be visible on screen
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow effect
      ctx.globalAlpha = effectiveAlpha;

      const glow = sprites?.glow[this.colorIndex] ?? null;
      if (glow) {
        // Glow texture available, use high-performance sprite rendering
        const size = radius * 8;
        ctx.drawImage(glow, px - size / 2, py - size / 2, size, size);

        // Stars above the slider-driven magnitude threshold earn diffraction
        // spikes; the same slider also stretches and brightens the arms.
        const spike = sprites?.spikes[this.colorIndex] ?? null;
        const spikeAmount = this.simService.controls.spikeAmount();
        if (spike && this.magnitude >= spikeThresholdForAmount(spikeAmount)) {
          const spikeSize = size * spikeSizeFactorForAmount(spikeAmount);
          ctx.globalAlpha = Math.min(1.0, effectiveAlpha * spikeAlphaForAmount(spikeAmount));
          ctx.drawImage(spike, px - spikeSize / 2, py - spikeSize / 2, spikeSize, spikeSize);
        }
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
