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
  /** Half-width of the sun's total label, in design units, for collision checks. */
  private readonly sunLabelHalfWidth = 55;
  /** Half-height of the sun's total label around the orbit centre, in design units. */
  private readonly sunLabelHalfHeight = 26;
  /** Approximate width of a planet's three-line label, in design units. */
  private readonly planetLabelWidth = 64;
  /** Approximate height of a planet's three-line label, in design units. */
  private readonly planetLabelHeight = 38;

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
      // Labels sit under their planet — unless that lands on the sun's total,
      // which a planet on a tight inner orbit can reach when many bands share
      // the footprint; then the label goes above the planet instead.
      const below = y + 12 + band.pct * 16;
      const hitsSun =
        Math.abs(x - this.cx) < this.sunLabelHalfWidth + this.planetLabelWidth / 2 &&
        below < this.cy + this.sunLabelHalfHeight &&
        below + this.planetLabelHeight > this.cy - this.sunLabelHalfHeight;
      // An above label is pinned by its bottom edge (see `.orr-planet-label--above`),
      // so larger landscape type grows it away from the planet, not onto it.
      const labelTop = hitsSun ? y - pr - 6 : below;
      return {
        band,
        rx,
        ry,
        x,
        y,
        pr,
        haloR: pr + 5,
        isLabelAbove: hitsSun,
        labelTopPct: ((this.orbitTop + labelTop) / 720) * 100,
        labelLeftPct: (x / 540) * 100,
      };
    }),
  );
}
