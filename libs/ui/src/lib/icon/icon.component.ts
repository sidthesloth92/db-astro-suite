import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { IconDefinition } from './icon-definition';

/**
 * Generic icon renderer. Renders a single `<svg>` whose inner body is
 * provided by an `IconDefinition` const (one per glyph, defined in
 * `libs/ui/src/lib/icons/{name}.icon.ts`).
 *
 * Replaces the per-icon component set — there is one component for the
 * SVG chrome (viewBox / stroke / linecap / linejoin / sizing) and many
 * tiny data files for the glyphs themselves.
 */
@Component({
  selector: 'dba-ui-icon',
  standalone: true,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  /** Icon to render. Provided as a `*.icon.ts` const, e.g. `downloadIcon`. */
  def = input.required<IconDefinition>();
  /** Pixel size for both width and height of the rendered SVG. Defaults to 16. */
  size = input<number>(16);
  /** Stroke width, in user units, for any line elements in the icon. Defaults to 1.5. */
  strokeWidth = input<number>(1.5);

  // Trusted HTML — body originates from in-repo source code, never user input.
  protected readonly safeBody = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.def().body),
  );
  protected readonly viewBox = computed(() => this.def().viewBox ?? '0 0 24 24');
  protected readonly fill = computed(() => this.def().fill ?? 'none');
}
