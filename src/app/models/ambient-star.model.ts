import { SimulationService } from '../services/simulation.service';

/**
 * @class AmbientStar
 * @description
 * Represents a standard background star that flickers and moves slowly towards the viewer.
 */
export class AmbientStar {
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
