import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { bandRowBreak } from '../../../utils/band-rows.util';
import { ThemeGearLineComponent } from '../shared/theme-gear-line/theme-gear-line.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Event Horizon theme — a black hole whose accretion disc encodes the data.
 * Each filter is an inclined elliptical arc (front sweep = exposure share,
 * dim back half behind), wrapping a photon ring and the void, with the total
 * integration set inside the horizon.
 */
@Component({
  selector: 'dba-ag-event-horizon-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent, ThemeGearLineComponent],
  templateUrl: './event-horizon-theme.component.html',
  styleUrl: './event-horizon-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventHorizonThemeComponent extends CardThemeBaseDirective {
  /** Black-hole centre X in chart coordinates. */
  protected readonly cx = 238;
  /** Black-hole centre Y in chart coordinates. */
  protected readonly cy = 186;

  /** Accretion-disc arcs — one inclined ellipse per filter. */
  protected readonly disks = computed(() => {
    const cx = 238;
    const cy = 186;
    const offsets = [-24, 140, 258];
    const perim = (rx: number, ry: number): number =>
      Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    return this.vm().integration.map((band, i, bands) => {
      // Up to three bands keep the design's 32 spacing; more share a span
      // ending at rx 192, instead of running off the card.
      const rx = 96 + i * (bands.length <= 3 ? 32 : 96 / (bands.length - 1));
      const ry = rx * 0.34;
      const p = perim(rx, ry);
      const off = offsets[i % offsets.length];
      return {
        id: band.id,
        color: band.color,
        time: band.time,
        frames: band.frames,
        rx,
        ry,
        backDash: `${p * 0.5} ${p}`,
        frontDash: `${p * band.pct * 0.8} ${p}`,
        backRot: `rotate(${off + 180} ${cx} ${cy})`,
        frontRot: `rotate(${off} ${cx} ${cy})`,
      };
    });
  });

  /**
   * Bands on the legend's first row when it splits in two (0 = one row).
   * Landscape has the width for all seven in one row, so it never splits.
   */
  protected legendBreak(): number {
    return this.isLandscapeFormat() ? 0 : bandRowBreak(this.vm().integration.length);
  }

  /** Total captured frames across every enabled band. */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }
}
