import { ChangeDetectionStrategy, Component } from '@angular/core';
import { haloBandPastel } from '../../../utils/halo-band-pastel.util';
import { CardThemeBaseDirective } from '../card-theme-base.directive';

/**
 * Halo theme — ethereal soft pastels over layered radial blurs. A glass hero,
 * an integration section of pastel-tinted band pills, and glass equipment /
 * pipeline / Bortle panels. Band pills use a fixed pastel palette keyed by
 * band (rose, sky, peach for the narrowband trio) rather than the raw filter
 * colours, matching the design source.
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
  /** Resolves the pastel accent for an integration pill from its band and position. */
  pastel(bandId: string, index: number): string {
    return haloBandPastel(bandId, index);
  }

  /** Soft gradient background for an integration pill (`c22 → c08`). */
  pillBackground(bandId: string, index: number): string {
    const c = this.pastel(bandId, index);
    return `linear-gradient(135deg, ${c}22, ${c}08)`;
  }

  /** Faint pastel border for an integration pill (`c33`). */
  pillBorder(bandId: string, index: number): string {
    return `1px solid ${this.pastel(bandId, index)}33`;
  }
}
