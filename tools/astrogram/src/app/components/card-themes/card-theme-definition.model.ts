import type { Type } from '@angular/core';
import type { CardThemeAccents } from '../../models/card-theme.model';
import type { ThemeDesignBasis } from '../../models/theme-canvas.model';
import type { CardThemeBaseDirective } from './card-theme-base.directive';

/**
 * One entry in the card-theme registry: display metadata, the standalone
 * component that renders the theme, and the accent colours it applies to the
 * card document when selected.
 */
export interface CardThemeDefinition {
  /** Human-readable name shown in the theme picker. */
  readonly label: string;
  /** One-line description shown as helper text under the picker. */
  readonly subtitle: string;
  /** Standalone theme component (extends `CardThemeBaseDirective`). */
  readonly component: Type<CardThemeBaseDirective>;
  /** Accents applied to `CardData` when this theme is picked. */
  readonly accents: CardThemeAccents;
  /**
   * Design artboard this theme's absolute type / spacing was authored
   * against. Omit to use the shared 540 × 720 design-source artboard.
   */
  readonly basis?: ThemeDesignBasis;
  /**
   * Artboard height to lay out against on landscape formats (1.91:1), in the
   * same units as `basis`. Shorter than the authored height so the theme
   * renders larger in a short, wide export; set to the smallest height at which
   * this theme's content still fits, measured rather than guessed. Omit to keep
   * the authored height — right for themes whose content cannot shrink.
   */
  readonly landscapeBasisHeight?: number;
  /**
   * Card opacity applied when this theme is picked, fading its backdrop
   * toward the user's image. Omit for the dark-theme default; light-on-paper
   * themes declare 1 so their pale type stays readable.
   */
  readonly defaultCardOpacity?: number;
}
