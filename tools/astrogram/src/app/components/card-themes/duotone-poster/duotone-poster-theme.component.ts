import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { FitTextDirective } from '../shared/fit-text/fit-text.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import type { HeroNameParts } from '../../../models/hero-name-parts.model';
import { splitHeroName } from '../../../utils/hero-name.util';
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
  imports: [ThemeStarfieldComponent, FitTextDirective, NgTemplateOutlet],
  templateUrl: './duotone-poster-theme.component.html',
  styleUrl: './duotone-poster-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuotonePosterThemeComponent extends CardThemeBaseDirective {
  /**
   * The object name split into the large headline (the proper name) and the
   * coral sub-headline (its descriptor). Splitting after the first word broke
   * multi-word names: "NORTH" over "AMERICA NEBULA COMPLEX".
   */
  protected readonly headlineName = computed<HeroNameParts>(() => splitHeroName(this.vm().objectName));

  /**
   * Every equipment row for the Gear footer column. The design capped the list
   * at five, silently dropping any row a user added beyond that.
   */
  protected readonly gearItems = computed<readonly ThemeGearItem[]>(() => this.vm().equipment);

  /** Location for the Process footer, wrapping only between its comma-separated parts. */
  protected readonly placeName = computed<string>(() => keepPlaceNamesTogether(this.vm().location));
}
