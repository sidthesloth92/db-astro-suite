import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Context bar shown above the preview area on desktop. Mirrors the
 * `PreviewCtxBar` primitive from the direction-b-polished design — a
 * narrow row that shows current dimensions on the left and a
 * segmented zoom selector on the right.
 */
@Component({
  selector: 'dba-ui-preview-context-bar',
  standalone: true,
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

  /** Emits the new zoom percentage when the user picks a different stop. */
  zoomChange = output<number>();

  /** Internal click handler — emits the chosen zoom level. */
  onPickZoom(level: number): void {
    if (level !== this.currentZoom()) {
      this.zoomChange.emit(level);
    }
  }
}
