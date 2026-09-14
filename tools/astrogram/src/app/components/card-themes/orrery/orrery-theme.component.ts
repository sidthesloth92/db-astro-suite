import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Orrery card theme — the integration bands orbit a golden "sun" (the total)
 * as tilted elliptical planetary orbits. Planet radius encodes each band's
 * share; an object title and a two-column Rig / Pipeline footer sit below.
 */
@Component({
  selector: 'dba-ag-orrery-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './orrery-theme.component.html',
  styleUrl: './orrery-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrreryThemeComponent extends CardThemeBaseDirective {
  /** Orbit-system centre x (design units). */
  protected readonly cx = 270;
  /** Orbit-system centre y within the orbit SVG (design units). */
  protected readonly cy = 232;
  /** Vertical offset of the orbit group within the 720-tall card. */
  protected readonly orbitTop = 20;
  /** Orbit start angles (degrees) for the first three bands. */
  protected readonly orbitAngles: readonly number[] = [-32, 158, 64];

  /** Per-band orbit geometry, planet position/size and HTML label placement. */
  protected readonly orbits = computed(() =>
    this.vm().integration.map((band, i, bands) => {
      // Orbits spread across the design's three-band footprint (outermost
      // rx 204, ry 88) however many bands there are; spaced a fixed step
      // apart, a seventh filter's orbit was 856 wide and ran off the card.
      const steps = Math.max(bands.length - 1, 2);
      const rx = 92 + i * (112 / steps);
      const ry = 40 + i * (48 / steps);
      const angle = this.orbitAngles[i] ?? -32 + i * 96; // exact for the first 3 bands
      const a = (angle * Math.PI) / 180;
      const x = this.cx + rx * Math.cos(a);
      const y = this.cy + ry * Math.sin(a);
      const pr = 7 + band.pct * 16;
      return {
        band,
        rx,
        ry,
        x,
        y,
        pr,
        haloR: pr + 5,
        labelTopPct: ((this.orbitTop + y + 12 + band.pct * 16) / 720) * 100,
        labelLeftPct: (x / 540) * 100,
      };
    }),
  );
}
