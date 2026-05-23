import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * SVG progress ring with a centred text label and a small caption.
 * Mirrors the `Ring` primitive from the direction-b-polished design,
 * used for per-filter integration times on the card preview.
 */
@Component({
  selector: 'dba-ui-progress-ring',
  standalone: true,
  templateUrl: './progress-ring.component.html',
  styleUrls: ['./progress-ring.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressRingComponent {
  /** Current filled portion of the ring. */
  value = input<number>(0);
  /** Total value the ring is filled against. */
  total = input<number>(1);
  /**
   * Stroke colour for the filled arc. Accepts any CSS colour string —
   * a `var(--db-color-...)` token from the theme is preferred so the
   * caller controls the palette.
   */
  color = input<string>('var(--db-color-neon-pink)');
  /** Small uppercase caption rendered below the ring. */
  label = input<string>('');
  /** Text rendered at the centre of the ring (e.g. "6h 0m"). */
  centerText = input<string>('');
  /** Outer SVG size, in CSS pixels. Defaults to 72. */
  size = input<number>(72);
  /** Ring radius, in user units. Defaults to 28. */
  radius = input<number>(28);

  /** Stroke circumference in user units, used for dasharray maths. */
  readonly circumference = computed(() => 2 * Math.PI * this.radius());
  /** Centre coordinate (cx/cy) of the SVG, derived from size. */
  readonly center = computed(() => this.size() / 2);
  /** Stroke dash offset that produces the current filled percentage. */
  readonly dashOffset = computed(() => {
    const total = this.total();
    if (total <= 0) {
      return this.circumference();
    }
    const pct = Math.max(0, Math.min(1, this.value() / total));
    return this.circumference() * (1 - pct);
  });
}
