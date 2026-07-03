import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';

/**
 * Halo theme — ethereal soft pastels over layered radial blurs. A glass hero,
 * an integration section of pastel-tinted band pills, and glass equipment /
 * pipeline / Bortle panels. Band pills use a fixed pastel palette (rose, sky,
 * peach) rather than the raw filter colours, matching the design source.
 */
@Component({
  selector: 'dba-ag-halo-theme',
  standalone: true,
  imports: [],
  templateUrl: './halo-theme.component.html',
  styleUrl: './halo-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HaloThemeComponent extends CardThemeBaseDirective {
  /** Pastel accent hexes the integration pills cycle through (rose, sky, peach). */
  private readonly pastels = ['#FFB0CE', '#A8D5FF', '#FFB8A8'] as const;

  /** Resolves the pastel accent for an integration pill by row index. */
  pastel(index: number): string {
    return this.pastels[index % this.pastels.length];
  }

  /** Soft gradient background for an integration pill (`c22 → c08`). */
  pillBackground(index: number): string {
    const c = this.pastel(index);
    return `linear-gradient(135deg, ${c}22, ${c}08)`;
  }

  /** Faint pastel border for an integration pill (`c33`). */
  pillBorder(index: number): string {
    return `1px solid ${this.pastel(index)}33`;
  }
}
