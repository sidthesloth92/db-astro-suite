import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { FitTextDirective } from '../shared/fit-text/fit-text.directive';
import { ThemeIconComponent } from '../shared/theme-icon/theme-icon.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import { EQUIPMENT_ICON_NAMES, SOFTWARE_ICON_NAMES } from '../theme-view.constants';
import type { HeroNameParts } from '../../../models/hero-name-parts.model';
import { splitHeroName } from '../../../utils/hero-name.util';

/**
 * Aurora theme — modern magazine editorial with weight-contrast Manrope. A
 * masthead rule, a rose-accented headline treatment, a gold-bar standfirst,
 * an oversized integration total with per-band figures, and a three-column
 * apparatus / workflow / sky footer.
 */
@Component({
  selector: 'dba-ag-aurora-editorial-theme',
  standalone: true,
  imports: [FitTextDirective, ThemeIconComponent, ThemeStarfieldComponent],
  templateUrl: './aurora-editorial-theme.component.html',
  styleUrl: './aurora-editorial-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuroraEditorialThemeComponent extends CardThemeBaseDirective {
  /**
   * The object name split into the oversized headline and the gold subhead.
   * Split before the descriptor ("Nebula"), not after the first word, which
   * set "North." over "— America Nebula Complex".
   */
  protected readonly heroName = computed<HeroNameParts>(() => splitHeroName(this.vm().objectName));

  /**
   * Apparatus rows past the designed icon set are rows the user added; the
   * shared icon cycle gave them the telescope and camera again, which named
   * the wrong kit, so they get a blank icon slot instead.
   */
  protected readonly equipmentIconCount = EQUIPMENT_ICON_NAMES.length;

  /** Workflow rows that carry a designed icon; see `equipmentIconCount`. */
  protected readonly softwareIconCount = SOFTWARE_ICON_NAMES.length;
}
