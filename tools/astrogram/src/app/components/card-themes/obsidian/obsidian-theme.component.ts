import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { rgbTriplet } from '../../../utils/picker-color.util';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeIconComponent } from '../shared/theme-icon/theme-icon.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Obsidian Glass theme — premium SaaS glassmorphism. Masthead with a conic
 * logo dot and frame line, a thin-weight hero, a stacked integration bar with
 * a colour-dot legend, and "Apparatus" / "Pipeline" glass panels over a
 * cyan/violet aurora.
 */
@Component({
  selector: 'dba-ag-obsidian-theme',
  standalone: true,
  imports: [ThemeIconComponent, ThemeStarfieldComponent],
  templateUrl: './obsidian-theme.component.html',
  styleUrl: './obsidian-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObsidianThemeComponent extends CardThemeBaseDirective {
  /** Frame number shown in the masthead (fixed design detail). */
  protected readonly frameLabel = 'FRAME N° 027';

  /** Secondary accent as `r, g, b`, for the violet glow in the backdrop. */
  protected readonly secondaryRgb = computed(() => rgbTriplet(this.cardData().secondaryAccentColor));

  /** Stacked-bar segment width as a CSS percentage for a band. */
  bandWidth(pct: number): string {
    return `${pct * 100}%`;
  }
}
