import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ThemeIconName } from '../theme-icon.types';

/**
 * Renders one of the themed line icons (Lucide-style, 24×24 viewBox,
 * 1.5px stroke, `currentColor`). Shared by every card theme so equipment /
 * software / meta rows draw the same premium icon set as the design source.
 */
@Component({
  selector: 'dba-ag-theme-icon',
  standalone: true,
  templateUrl: './theme-icon.component.html',
  styleUrl: './theme-icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeIconComponent {
  /** Which glyph to render. */
  readonly name = input.required<ThemeIconName>();
  /** Icon edge length in px. */
  readonly size = input<number>(14);
  /** Stroke colour (defaults to inherited `currentColor`). */
  readonly color = input<string>('currentColor');
  /** Stroke width in px. */
  readonly strokeWidth = input<number>(1.5);
}
