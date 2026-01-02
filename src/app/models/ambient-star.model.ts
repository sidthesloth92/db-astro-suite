import { SimulationService } from '../services/simulation.service';

/**
 * @class AmbientStar
 * @description
 * Represents a standard background star that moves slowly towards the viewer.
 */
export class AmbientStar {
  x = 0; // X position in 3D space (relative to center)
  y = 0; // Y position in 3D space (relative to center)
  z = 0; // Z position in 3D space (depth from camera)
  initialZ = 0;

  constructor(
    private width: number, 
    private height: number,
    private simService: SimulationService
  ) {
    this.reset();
  }

  /**
   * Resets the star to a new random 3D position at a distance.
   */
  reset() {
    // MAX_DEPTH is set to viewport width to keep perspective projection proportional.
    // At z = MAX_DEPTH, 3D units map 1:1 to 2D pixels.
    const MAX_DEPTH = this.width;

    // Centering Logic:
    // Math.random() [0, 1] -> Shifting [-0.5, 0.5] -> Scaling [-width/2, width/2].
    // This ensures stars are distributed evenly around the (0,0) center point.
    this.x = (Math.random() - 0.5) * this.width;
    this.y = (Math.random() - 0.5) * this.height;
    
    this.z = Math.random() * MAX_DEPTH;
    this.initialZ = this.z;
  }

  /**
   * Updates the depth of the star.
   */
  update() {
    const speed = this.simService.controls.ambientStarSpeed();
    this.z -= speed;
    
    // Recycle the star if it's passed behind the camera
    if (this.z <= 0) {
      // Star has passed behind the observer, wrap it back to the far distance
      this.reset();
    }
  }

  /**
   * Projects the 3D position to 2D canvas coordinates and renders the star.
   */
  draw(ctx: CanvasRenderingContext2D, width: number, currentScale: number, sprite: HTMLCanvasElement | null) {
    // 3D to 2D projection factor (Perspective projection)
    // As z gets smaller (closer to camera), k gets larger (bigger on screen)
    const k = width / this.z;
    const px = this.x * k;
    const py = this.y * k;
    
    // Calculate size and opacity based on proximity (Parallax)
    const proximity = 1 - this.z / this.initialZ;
    const opacity = proximity;
    const scaleCompensation = 1 / currentScale;
    
    // Base size scaled by proximity and zoom compensation
    const radius = proximity * this.simService.controls.baseStarSize() * scaleCompensation * 0.35;
    const effectiveAlpha = Math.min(1.0, opacity * 1.5);

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
