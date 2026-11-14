import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Slim numeric slider for inspector panels. Mirrors the `SliderP`
 * primitive from the direction-b-polished design — a thin track,
 * pink dot indicator, and a boxed numeric readout to the right.
 * Built on a native `<input type="range">` for accessibility.
 */
@Component({
  selector: 'dba-ui-micro-slider',
  standalone: true,
  templateUrl: './micro-slider.component.html',
  styleUrls: ['./micro-slider.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MicroSliderComponent {
  /** Current numeric value. */
  value = input<number>(0);
  /** Minimum allowable value. Defaults to 0. */
  min = input<number>(0);
  /** Maximum allowable value. Defaults to 100. */
  max = input<number>(100);
  /** Step increment between values. Defaults to 1. */
  step = input<number>(1);
  /** Optional unit suffix shown in the readout (e.g. "%", "px"). */
  suffix = input<string | undefined>(undefined);
  /**
   * When `false`, the numeric readout above the track is hidden — useful for
   * consumers that render the value alongside their own label row to save
   * vertical space. Defaults to `true`.
   */
  showReadout = input<boolean>(true);
  /**
   * Value the filled track starts from. Left unset, the track fills from the minimum. Set it
   * to a value inside the range (0 on a -10 to 10 slider, say) for a control that works both
   * ways from a resting point: the track then fills from that point toward the handle, and a
   * tick marks the point.
   */
  fillFrom = input<number | undefined>(undefined);

  /** Emits the new numeric value as the user drags. */
  valueChange = output<number>();

  /** Position of the handle along the track, as a percentage (0–100). */
  readonly percent = computed(() => this.toPercent(this.value()));

  /** Position of the {@link fillFrom} point along the track (0–100), or null when it is unset. */
  readonly originPercent = computed(() => {
    const origin = this.fillFrom();
    return origin === undefined ? null : this.toPercent(origin);
  });

  /** Where the filled track starts and how long it is, as percentages of the track. */
  readonly fill = computed(() => {
    const handle = this.percent();
    const origin = this.originPercent() ?? 0;
    return { left: Math.min(handle, origin), width: Math.abs(handle - origin) };
  });

  /** A value's position along the track as a percentage, clamped to 0–100. */
  private toPercent(value: number): number {
    const min = this.min();
    const max = this.max();
    if (max <= min) {
      return 0;
    }
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }

  /** Internal change handler — forwards the parsed numeric value. */
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const parsed = Number.parseFloat(target.value);
    if (!Number.isNaN(parsed)) {
      this.valueChange.emit(parsed);
    }
  }
}
