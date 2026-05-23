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

  /** Emits the new numeric value as the user drags. */
  valueChange = output<number>();

  /** Filled-track percentage (0–100), used to size the progress bar. */
  readonly percent = computed(() => {
    const v = this.value();
    const min = this.min();
    const max = this.max();
    if (max <= min) {
      return 0;
    }
    const pct = ((v - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, pct));
  });

  /** Internal change handler — forwards the parsed numeric value. */
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const parsed = Number.parseFloat(target.value);
    if (!Number.isNaN(parsed)) {
      this.valueChange.emit(parsed);
    }
  }
}
