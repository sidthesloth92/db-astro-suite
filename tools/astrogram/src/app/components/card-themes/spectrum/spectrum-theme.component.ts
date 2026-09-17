import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { FitTextDirective } from '../shared/fit-text/fit-text.directive';
import type { HeroNameParts } from '../../../models/hero-name-parts.model';
import { splitHeroName } from '../../../utils/hero-name.util';

/**
 * Spectrum theme — a vibrant pink→magenta→violet→cyan gradient hero over a
 * near-black body. Bold Manrope display headline, an oversized integration
 * total with gradient band bars, and an equipment / pipeline table closing on
 * a gradient-dot Bortle strip.
 */
@Component({
  selector: 'dba-ag-spectrum-theme',
  standalone: true,
  imports: [FitTextDirective],
  templateUrl: './spectrum-theme.component.html',
  styleUrl: './spectrum-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectrumThemeComponent extends CardThemeBaseDirective {
  /**
   * The object name split into the gradient headline and the subhead. Split
   * before the descriptor ("Nebula"), not after the first word, which left
   * "North" alone over "America Nebula Complex".
   */
  protected readonly heroName = computed<HeroNameParts>(() => splitHeroName(this.vm().objectName));

  /** Sub-headline: the descriptor joined to the catalogue id (`Nebula · NGC 2237`). */
  protected readonly heroSubtitle = computed<string>(() => {
    const rest = this.heroName().rest;
    const id = this.vm().objectId;
    if (rest && id) {
      return `${rest} · ${id}`;
    }
    return rest || id;
  });
}
