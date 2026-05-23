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
 *
 * Implementation note: the entire `<svg>` (chrome + body) is built as a
 * single trusted HTML string and bound via `[innerHTML]` on the host
 * `<dba-ui-icon>` element. This avoids setting `innerHTML` directly on
 * an SVG element — AnalogJS / Angular SSR does not implement that path
 * (it surfaces as `NotYetImplemented` at pre-render time).
 */
@Component({
  selector: 'dba-ui-icon',
  standalone: true,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[innerHTML]': 'safeSvg()' },
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  /** Icon to render. Provided as a `*.icon.ts` const, e.g. `downloadIcon`. */
  def = input.required<IconDefinition>();
  /** Pixel size for both width and height of the rendered SVG. Defaults to 16. */
  size = input<number>(16);
  /** Stroke width, in user units, for any line elements in the icon. Defaults to 1.5. */
  strokeWidth = input<number>(1.5);

  /**
   * Trusted full-SVG markup. Safe because the `body` of every
   * IconDefinition originates from in-repo source code (never user
   * input), and every numeric attribute is locally produced from typed
   * `number` inputs.
   */
  protected readonly safeSvg = computed(() => {
    const def = this.def();
    const viewBox = def.viewBox ?? '0 0 24 24';
    const fill = def.fill ?? 'none';
    const size = this.size();
    const strokeWidth = this.strokeWidth();
    const svg =
      `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="${fill}" ` +
      `stroke="currentColor" stroke-width="${strokeWidth}" ` +
      `stroke-linecap="round" stroke-linejoin="round">${def.body}</svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  });
}
