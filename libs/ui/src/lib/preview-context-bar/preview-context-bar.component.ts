import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SegmentedTabsComponent } from '../segmented-tabs/segmented-tabs.component';
import type { SegmentedTabOption } from '../segmented-tabs/segmented-tabs.model';
import type { SelectItem } from '../select/select.model';

/**
 * Minimal context bar shown above the preview area. Renders the mode
 * switcher tabs centered when `modeOptions` is provided; otherwise renders
 * nothing. No box, no zoom control — kept deliberately lean so the preview
 * gets maximum vertical space.
 */
@Component({
  selector: 'dba-ui-preview-context-bar',
  standalone: true,
  imports: [SegmentedTabsComponent],
  templateUrl: './preview-context-bar.component.html',
  styleUrls: ['./preview-context-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewContextBarComponent {
  /** Human-readable dimensions string (e.g. `"1080 × 1440"`). */
  dimensions = input<string>('');
  /** Available zoom-percentage stops. */
  zoomLevels = input<readonly number[]>([50, 75, 100, 150]);
  /** Current zoom percentage. */
  currentZoom = input<number>(100);

  /** Optional preview-size dropdown options; bar hides the control if empty. */
  sizeOptions = input<readonly SelectItem[]>([]);
  /** Currently selected size key (matches a `value` in `sizeOptions`). */
  selectedSizeKey = input<string>('');

  /** Optional mode-tab options; bar hides the control if empty. */
  modeOptions = input<readonly SegmentedTabOption[]>([]);
  /** Active mode id (matches an `id` in `modeOptions`). */
  selectedModeId = input<string>('');

  /** Emits the new zoom percentage when the user picks a different stop. */
  zoomChange = output<number>();
  /** Emits the new preview-size key when the user picks a different size. */
  sizeChange = output<string>();
  /** Emits the new mode id when the user picks a different mode. */
  modeChange = output<string>();

  /** Zoom select options derived from `zoomLevels()` — formatted as `"100%"`. */
  protected readonly zoomSelectOptions = computed<readonly SelectItem[]>(() =>
    this.zoomLevels().map((z) => ({ value: String(z), label: `${z}%` })),
  );

  /** String-coerced current zoom, since the native `<select>` value is a string. */
  protected readonly zoomSelectValue = computed<string>(() => String(this.currentZoom()));

  /** Internal handler — re-emits the chosen zoom level as a number. */
  protected onZoomChange(value: string | number | boolean): void {
    const level = Number(value);
    if (Number.isFinite(level) && level !== this.currentZoom()) {
      this.zoomChange.emit(level);
    }
  }

  /** Internal handler — re-emits the chosen size key as a string. */
  protected onSizeChange(value: string | number | boolean): void {
    const key = String(value);
    if (key !== this.selectedSizeKey()) {
      this.sizeChange.emit(key);
    }
  }

  /** Internal handler — re-emits the chosen mode id. */
  protected onModeChange(id: string): void {
    if (id !== this.selectedModeId()) {
      this.modeChange.emit(id);
    }
  }
}
