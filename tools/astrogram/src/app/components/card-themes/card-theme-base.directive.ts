import { Directive, computed, inject } from '@angular/core';
import { CardDataService } from '../../services/card-data.service';
import type { ThemeViewData } from '../../models/card-theme.model';
import type { ThemeIconName } from './shared/theme-icon.types';
import { buildThemeViewData } from './theme-view-data.util';
import { LANDSCAPE_ASPECT_RATIOS } from '../../constants/theme-canvas.constants';
import {
  DATA_ART_FIT,
  DATA_ART_FIT_LANDSCAPE,
  equipmentIcon,
  softwareIcon,
} from './theme-view.constants';

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

  /**
   * Live card document. Themes render `vm()`; this is for the rare theme
   * whose design needs a raw field the view-model deliberately reshapes
   * (e.g. the unsplit title, or per-filter emoji icons). Treat as read-only.
   */
  protected readonly cardData = this.dataService.cardData;

  /** True on the landscape formats (1.91:1), where data art is fitted rather than cropped. */
  protected readonly isLandscapeFormat = computed(() =>
    LANDSCAPE_ASPECT_RATIOS.includes(this.cardData().aspectRatio),
  );

  /**
   * `preserveAspectRatio` for a theme's full-card data-art SVG: cover the
   * canvas on portrait and square formats, fit the whole artboard on landscape.
   * Only for art that carries data (orbits, planets, star charts) — decorative
   * backgrounds should keep cropping at every format.
   *
   * A theme that overlays HTML labels on the art at viewBox percentages must
   * also frame those labels to the fitted art box on landscape, or they drift
   * away from the points they name — see the orrery and constellation themes.
   */
  protected readonly dataArtFit = computed(() =>
    this.isLandscapeFormat() ? DATA_ART_FIT_LANDSCAPE : DATA_ART_FIT,
  );

  /** Resolves the equipment line icon for a row index. */
  equipmentIcon(index: number): ThemeIconName {
    return equipmentIcon(index);
  }

  /** Resolves the software line icon for a row index. */
  softwareIcon(index: number): ThemeIconName {
    return softwareIcon(index);
  }

  /**
   * `vm().bandKind` capitalised for use at the start of a label, e.g.
   * `Narrowband`. Empty when no filter is enabled, so the designs that show
   * it can drop the whole element rather than render a stray separator.
   */
  readonly bandKindLabel = computed<string>(() => {
    const kind = this.vm().bandKind;
    return kind ? `${kind.charAt(0).toUpperCase()}${kind.slice(1)}` : '';
  });

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
