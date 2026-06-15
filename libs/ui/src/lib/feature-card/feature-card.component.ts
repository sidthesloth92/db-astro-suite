import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Presentational feature tile: a square icon plate beside an uppercase heading
 * and a short body line. The icon is supplied by the parent through the default
 * content slot (an inline `<svg>` or a `dba-ui-icon`), keeping the library free
 * of any icon-set coupling. Square-edged and styled entirely from `@db-astro/theme`
 * tokens, so the hub and Celestory render an identical card. Fully parent-driven
 * — no state, no HTTP, no side effects.
 */
@Component({
  selector: 'dba-ui-feature-card',
  standalone: true,
  templateUrl: './feature-card.component.html',
  styleUrl: './feature-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureCardComponent {
  /** Uppercase card heading. */
  readonly heading = input.required<string>();
  /** Supporting body line rendered beneath the heading. */
  readonly body = input.required<string>();
}
