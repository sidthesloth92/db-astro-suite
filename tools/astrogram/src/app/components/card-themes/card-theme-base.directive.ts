import { Directive, computed, inject } from '@angular/core';
import { CardDataService } from '../../services/card-data.service';
import type { ThemeViewData } from '../../models/card-theme.model';
import type { ThemeIconName } from './shared/theme-icon.types';
import { buildThemeViewData } from './theme-view-data.util';
import { equipmentIcon, softwareIcon } from './theme-view.constants';

/**
 * Shared base for every card-theme component. Injects the card store, maps
 * the live document into the read-only `ThemeViewData` a theme renders, and
 * exposes the themed icon helpers.
 *
 * Theme stylesheets MUST set `:host { display: block; width: 100%; height: 100% }`
 * so the theme fills the `.card-content` box owned by `BaseCardPreviewComponent`
 * and reshapes cleanly across aspect ratios.
 */
@Directive()
export abstract class CardThemeBaseDirective {
  private readonly dataService = inject(CardDataService);

  /** Read-only view-model driving every binding in the theme template. */
  readonly vm = computed<ThemeViewData>(() => buildThemeViewData(this.dataService.cardData()));

  /** Resolves the equipment line icon for a row index. */
  equipmentIcon(index: number): ThemeIconName {
    return equipmentIcon(index);
  }

  /** Resolves the software line icon for a row index. */
  softwareIcon(index: number): ThemeIconName {
    return softwareIcon(index);
  }

  /** Bortle scale segments `[1..9]` for meter rendering. */
  readonly bortleSegments = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

  /** Whether a Bortle meter segment is lit for the current value. */
  isBortleLit(segment: number): boolean {
    return segment <= this.vm().bortle;
  }

  /** Opacity ramp for a lit Bortle segment (dimmer at the low end). */
  bortleOpacity(segment: number): number {
    return segment <= this.vm().bortle ? 0.4 + segment * 0.07 : 1;
  }
}
