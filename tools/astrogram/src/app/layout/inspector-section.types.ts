/**
 * Shared inspector / mobile section identifiers used by the desktop
 * inspector host, the mobile shell, and the bottom-nav icon contracts.
 * Kept as discriminated unions so any new section requires touching one
 * file rather than scattered string literals.
 */

/** Inspector section id for infographic mode (desktop rail). */
export type InfographicSectionId = 'layout' | 'object' | 'capture' | 'equipment' | 'export';

/** Inspector section id for stellar-map mode (desktop rail). */
export type StellarSectionId = 'filters' | 'style' | 'selected';

/** Mobile bottom-nav section id for infographic mode. */
export type MobileInfographicId = 'object' | 'capture' | 'equipment' | 'layout';

/** Mobile bottom-nav section id for stellar-map mode. */
export type MobileStellarId = 'filters' | 'style' | 'selected';

/**
 * Icon keys used by the mobile bottom-nav `iconName` slot — kept as a
 * union so the parent's `@switch` is exhaustive over the icon set.
 */
export type MobileNavIconId =
  | 'image'
  | 'aperture'
  | 'telescope'
  | 'palette'
  | 'crop'
  | 'filter'
  | 'target';

/** Strongly typed bottom-nav item — replaces the loose string `iconName`. */
export interface MobileNavItem<TId extends string = string> {
  readonly id: TId;
  readonly label: string;
  readonly iconName: MobileNavIconId;
}
