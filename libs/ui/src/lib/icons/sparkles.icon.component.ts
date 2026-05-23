import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Lucide-style "Sparkles" line icon. 24px viewBox, stroke="currentColor". */
@Component({
  selector: 'dba-ui-icon-sparkles',
  standalone: true,
  templateUrl: './sparkles.icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class SparklesIconComponent {
  /** Pixel size for both width and height of the rendered SVG. Defaults to 16. */
  size = input<number>(16);
  /** Stroke width, in user units, for the icon path(s). Defaults to 1.5. */
  strokeWidth = input<number>(1.5);
  /** SVG fill — solid for filled glyphs, "none" for line glyphs. */
  readonly fill = 'none' as const;
}
