import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeGearLineComponent } from '../shared/theme-gear-line/theme-gear-line.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * System Line theme — the solar system as a number line. Each filter is a
 * planet placed along an ecliptic axis at its cumulative share of the night,
 * sized by exposure, with the session origin rendered as the Sun. A centred
 * total display and the shared compact footer close the card.
 */
@Component({
  selector: 'dba-ag-system-line-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent, ThemeGearLineComponent],
  templateUrl: './system-line-theme.component.html',
  styleUrl: './system-line-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemLineThemeComponent extends CardThemeBaseDirective {
  /** Hour graticule ticks along the ecliptic axis (0h–10h). */
  protected readonly hourTicks = [0, 2, 4, 6, 8, 10].map((hh) => ({
    hh,
    x: 48 + ((hh * 60) / 620) * 400,
  }));

  /** Planet geometry: one disc per filter, placed by cumulative share. */
  protected readonly planets = computed(() => {
    const span = 400;
    let acc = 0;
    return this.vm().integration.map((band, i) => {
      const cx = 48 + (acc + band.pct / 2) * span;
      acc += band.pct;
      const r = 7 + band.pct * 30;
      return {
        id: band.id,
        color: band.color,
        time: band.time,
        frames: band.frames,
        cx,
        r,
        glowR: r + 6,
        ringRx: r + 12,
        ringRy: (r + 12) * 0.28,
        tickY1: 120 - r - 12,
        tickY2: 120 - r - 4,
        isFirst: i === 0,
        gradId: `sl-pl-${i}`,
      };
    });
  });

  /** Total captured frames across every enabled band. */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }
}
