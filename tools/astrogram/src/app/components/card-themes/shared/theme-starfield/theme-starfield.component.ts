import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { generateStarfield, type StarPoint } from '../star-field.util';

/**
 * Absolutely-positioned decorative star field used as a theme background
 * layer. Fills its positioned parent and crops (`slice`) so the deterministic
 * 540×720 layout scales with the card.
 */
@Component({
  selector: 'dba-ag-theme-starfield',
  standalone: true,
  templateUrl: './theme-starfield.component.html',
  styleUrl: './theme-starfield.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeStarfieldComponent {
  /** Reference width the star positions are computed against. */
  readonly width = input<number>(540);
  /** Reference height the star positions are computed against. */
  readonly height = input<number>(720);
  /** Number of stars. */
  readonly density = input<number>(80);
  /** Global opacity multiplier. */
  readonly opacity = input<number>(0.7);
  /** Star fill colour. */
  readonly color = input<string>('#ffffff');
  /** Layout seed — vary per theme for a different field. */
  readonly seed = input<number>(1);

  /** Generated star points for the current inputs. */
  readonly stars = computed<StarPoint[]>(() =>
    generateStarfield(this.width(), this.height(), this.density(), this.opacity(), this.seed()),
  );

  /** SVG viewBox string. */
  readonly viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);
}
