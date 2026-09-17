import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeGearLineComponent } from '../shared/theme-gear-line/theme-gear-line.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Moon Phases theme — each filter is drawn as a lunar phase whose illuminated
 * fraction equals that filter's share of the night. A terminator path fills
 * each moon disc, bordered by the band colour, over a starfield.
 */
@Component({
  selector: 'dba-ag-moon-phases-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent, ThemeGearLineComponent],
  templateUrl: './moon-phases-theme.component.html',
  styleUrl: './moon-phases-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoonPhasesThemeComponent extends CardThemeBaseDirective {
  /** Decorative craters on the lit side (deterministic positions). */
  protected readonly craters = [
    { cx: 80.68, cy: 41.8, r: 5.4, opacity: 0.14 },
    { cx: 68.8, cy: 76.36, r: 7.56, opacity: 0.12 },
    { cx: 87.7, cy: 64.48, r: 3.78, opacity: 0.16 },
  ];

  /** One lunar disc per filter, illuminated by exposure share. */
  protected readonly moons = computed(() =>
    this.vm().integration.map((band) => ({
      id: band.id,
      color: band.color,
      time: band.time,
      frames: band.frames,
      d: this.moonPath(band.pct),
      pctLabel: Math.round(band.pct * 100),
    })),
  );

  /** SVG path for a right-lit moon phase at illuminated fraction `f`. */
  private moonPath(f: number): string {
    const R = 54;
    const cx = 58;
    const cy = 58;
    const rx = R * Math.abs(2 * f - 1);
    const sweep = f > 0.5 ? 1 : 0;
    return `M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx} ${cy + R} A ${rx} ${R} 0 0 ${sweep} ${cx} ${cy - R} Z`;
  }
}
