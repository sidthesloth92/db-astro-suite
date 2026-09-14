import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { bandRowBreak } from '../../../utils/band-rows.util';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Ringed Planet card theme — a Saturn-like portrait where each integration
 * band is a tilted elliptical ring around the planet. The lit front-arc of a
 * ring encodes that band's share; an object title, a ring legend and a
 * two-column Apparatus / Pipeline footer sit below.
 */
@Component({
  selector: 'dba-ag-ringed-planet-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './ringed-planet-theme.component.html',
  styleUrl: './ringed-planet-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RingedPlanetThemeComponent extends CardThemeBaseDirective {
  /** Planet centre x (design units). */
  protected readonly cx = 270;
  /** Planet centre y within the planet SVG (design units). */
  protected readonly cy = 252;
  /** Planet body radius (design units). */
  protected readonly planetRadius = 96;
  /** Vertical offset of the planet group within the 720-tall card. */
  protected readonly planetTop = 24;
  /** Vertical squash applied to the rings to fake the ring-plane tilt. */
  protected readonly ringSquash = 0.32;
  /** Rotation transform placing the tilted ring plane at the planet centre. */
  protected readonly ringGroupTransform = `translate(${this.cx} ${this.cy}) rotate(-18)`;

  /** Per-band ring geometry with back/front dash arrays (front encodes share). */
  protected readonly rings = computed(() =>
    this.vm().integration.map((band, i, bands) => {
      // Rings share the design's three-band span (outermost 52 past the
      // first) however many bands there are; at a fixed 26 apart, seven
      // filters pushed the outer rings off both edges of the card.
      const rr = this.planetRadius + 34 + i * (52 / Math.max(bands.length - 1, 2));
      const circ = Math.PI * rr;
      return {
        band,
        rr,
        ry: rr * this.ringSquash,
        backDash: `${circ} ${circ * 2}`,
        frontDash: `${circ * band.pct} ${circ * 4}`,
      };
    }),
  );

  /**
   * Bands on the landscape legend's first row when it splits in two (0 = one
   * row). Left to wrap, seven bands filled the row and left "B" alone beside
   * the total. Portrait legends wrap within their narrower width as before.
   */
  protected legendBreak(): number {
    return this.isLandscapeFormat() ? bandRowBreak(this.vm().integration.length) : 0;
  }

  /** Faint latitude bands across the planet body. */
  protected readonly latitudeBands = [-0.4, -0.1, 0.2, 0.5].map((f) => ({
    cy: this.cy + f * this.planetRadius,
    rx: Math.sqrt(Math.max(0, 1 - f * f)) * this.planetRadius,
  }));
}
