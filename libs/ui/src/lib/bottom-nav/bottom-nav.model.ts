/**
 * Single tab descriptor for `BottomNavComponent`. `iconName` is an
 * opaque key — the consumer's template uses it to choose which icon
 * component to render in the projected icon slot.
 */
export interface BottomNavItem {
  /** Stable identifier emitted by `activate`. */
  readonly id: string;
  /** User-visible label rendered under the icon. */
  readonly label: string;
  /** Optional opaque key used by the parent to resolve an icon. */
  readonly iconName?: string;
}
