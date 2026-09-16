import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import { cometStreakLength, cometStreakOffset } from '../../../utils/comet-streak.util';
import { keepPlaceNamesTogether } from '../../../utils/keep-together.util';

/**
 * Comet card theme — a comet with its nucleus at upper-right and a curved
 * tail sweeping to lower-left. Each integration band is a coloured ion streak
 * whose dashed length encodes its share; a band legend, object title near the
 * nucleus and a two-column Apparatus / Pipeline footer complete the card.
 */
@Component({
  selector: 'dba-ag-comet-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './comet-theme.component.html',
  styleUrl: './comet-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CometThemeComponent extends CardThemeBaseDirective {
  /** Nucleus x (design units). */
  protected readonly nx = 540 * 0.74;
  /** Nucleus y (design units). */
  protected readonly ny = 150;
  /** Tail end x (design units). */
  protected readonly tailEndX = 540 * 0.1;
  /** Tail end y (design units). */
  protected readonly tailEndY = 470;
  /** Quadratic control-point x (design units). */
  protected readonly ctrlX = 540 * 0.3;
  /** Quadratic control-point y (design units). */
  protected readonly ctrlY = 210;

  /** Broad comet-tail fill path. */
  protected readonly tailPath =
    `M ${this.nx} ${this.ny} ` +
    `Q ${this.ctrlX} ${this.ctrlY} ${this.tailEndX} ${this.tailEndY} ` +
    `L ${this.tailEndX + 50} ${this.tailEndY + 8} ` +
    `Q ${this.ctrlX + 40} ${this.ctrlY + 30} ${this.nx + 8} ${this.ny + 14} Z`;

  /**
   * Per-band ion streaks: colour-coded, length scaled by integration share.
   * All of them leave the nucleus, fanned tightly enough that seven bands stay
   * on the tail rather than dropping below it towards the title.
   */
  protected readonly ionStreaks = computed(() =>
    this.vm().integration.map((band, i, bands) => {
      const off = cometStreakOffset(i, bands.length);
      return {
        band,
        path:
          `M ${this.nx} ${this.ny + off} ` +
          `Q ${this.ctrlX} ${this.ctrlY + off} ${this.tailEndX + 10} ${this.tailEndY + off}`,
        dash: `${cometStreakLength(band.pct)} 600`,
      };
    }),
  );

  /** Location for the footer's sky line, wrapping only between its comma-separated parts. */
  protected readonly placeName = computed<string>(() => keepPlaceNamesTogether(this.vm().location));

  /** Dust particles distributed along the tail's quadratic curve. */
  protected readonly dust = Array.from({ length: 46 }, (_unused, i) => {
    const t = i / 46;
    const mt = 1 - t;
    const x = mt * mt * this.nx + 2 * mt * t * this.ctrlX + t * t * this.tailEndX;
    const y = mt * mt * this.ny + 2 * mt * t * this.ctrlY + t * t * this.tailEndY;
    const jitter = ((i * 53) % 18) - 9;
    return {
      cx: x + jitter,
      cy: y + jitter * 0.4,
      r: (1 - t) * 1.8 + 0.4,
      opacity: (1 - t) * 0.8,
    };
  });
}
