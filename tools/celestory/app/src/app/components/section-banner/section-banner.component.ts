import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CelIconComponent, type CelIconName } from '../cel-icon/cel-icon.component';
import { ConstellationComponent } from '../constellation/constellation.component';

/** A big astro section header (number + title + glyph) with a constellation decoration. */
@Component({
  selector: 'dba-section-banner',
  standalone: true,
  imports: [CelIconComponent, ConstellationComponent],
  templateUrl: './section-banner.component.html',
  styleUrl: './section-banner.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionBannerComponent {
  /** Two-digit chapter number, e.g. "02". */
  readonly num = input<string>('');
  /** Small eyebrow label. */
  readonly eyebrow = input<string>('');
  /** Section title. */
  readonly title = input.required<string>();
  /** Section glyph icon. */
  readonly glyph = input.required<CelIconName>();
  /** Sub line. */
  readonly sub = input<string>('');
  /** Constellation seed. */
  readonly seed = input<number>(4);
}
