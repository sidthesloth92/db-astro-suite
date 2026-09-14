import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import type { ThemeGearItem } from '../../../models/card-theme.model';
import { keepPlaceNamesTogether } from '../../../utils/keep-together.util';

/**
 * Duotone Poster theme — a bold riso print in indigo, coral and sky. Overprinted
 * planet blobs and a halftone glow sit behind a big uppercase headline, an
 * oversized total-integration number, and two footer spec columns.
 */
@Component({
  selector: 'dba-ag-duotone-poster-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './duotone-poster-theme.component.html',
  styleUrl: './duotone-poster-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuotonePosterThemeComponent extends CardThemeBaseDirective {
  /** First word of the object name — the large poster headline line. */
  protected readonly objectNameHead = computed<string>(() => this.vm().objectName.split(' ')[0] ?? '');

  /** Remaining words of the object name — the coral sub-headline line. */
  protected readonly objectNameTail = computed<string>(() =>
    this.vm().objectName.split(' ').slice(1).join(' '),
  );

  /**
   * Every equipment row for the Gear footer column. The design capped the list
   * at five, silently dropping any row a user added beyond that.
   */
  protected readonly gearItems = computed<readonly ThemeGearItem[]>(() => this.vm().equipment);

  /** Location for the Process footer, wrapping only between its comma-separated parts. */
  protected readonly placeName = computed<string>(() => keepPlaceNamesTogether(this.vm().location));
}
