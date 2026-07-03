import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeIconComponent } from '../shared/theme-icon/theme-icon.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Aurora theme — modern magazine editorial with weight-contrast Manrope. A
 * masthead rule, a rose-accented headline treatment, a gold-bar standfirst,
 * an oversized integration total with per-band figures, and a three-column
 * apparatus / workflow / sky footer.
 */
@Component({
  selector: 'dba-ag-aurora-editorial-theme',
  standalone: true,
  imports: [ThemeIconComponent, ThemeStarfieldComponent],
  templateUrl: './aurora-editorial-theme.component.html',
  styleUrl: './aurora-editorial-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuroraEditorialThemeComponent extends CardThemeBaseDirective {
  /** First word of the object name — the oversized headline. */
  heroPrimary(): string {
    const name = this.vm().objectName;
    const idx = name.indexOf(' ');
    return idx === -1 ? name : name.slice(0, idx);
  }

  /** Remainder of the object name after the first word (empty if single word). */
  heroRest(): string {
    const name = this.vm().objectName;
    const idx = name.indexOf(' ');
    return idx === -1 ? '' : name.slice(idx + 1);
  }
}
