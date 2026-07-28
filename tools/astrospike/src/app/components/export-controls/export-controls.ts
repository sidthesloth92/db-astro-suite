import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  MicroSliderComponent,
  SplitButtonComponent,
  TextButtonComponent,
} from '@db-astro-suite/ui';
import {
  EXPORT_FORMAT_BY_MENU_VALUE,
  EXPORT_MENU_ITEMS,
  JPEG_QUALITY_MAX,
  JPEG_QUALITY_MIN,
  JPEG_QUALITY_STEP,
} from '../../constants/export.constants';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { formatBytes } from '../../utils/format-bytes.util';

/**
 * Export block of the controls pane: the format split-button, the JPEG-only
 * quality slider, the export error line, and a re-save shortcut for the last
 * successful export.
 *
 * Smart child of the controls panel — it reads and drives the shared editor
 * state directly rather than proxying every binding through the parent.
 */
@Component({
  selector: 'dba-as-export-controls',
  standalone: true,
  imports: [MicroSliderComponent, SplitButtonComponent, TextButtonComponent],
  templateUrl: './export-controls.html',
  styleUrl: './export-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportControls {
  /** Shared editor state — export format, quality, and results. */
  protected readonly editor = inject(SpikeEditorService);

  /** Format entries offered by the split-button dropdown. */
  protected readonly menuItems = EXPORT_MENU_ITEMS;

  /** Lowest selectable JPEG quality. */
  protected readonly jpegQualityMin = JPEG_QUALITY_MIN;

  /** Highest selectable JPEG quality. */
  protected readonly jpegQualityMax = JPEG_QUALITY_MAX;

  /** Step increment of the JPEG quality slider. */
  protected readonly jpegQualityStep = JPEG_QUALITY_STEP;

  /**
   * Primary segment label — the selected format's menu label, replaced by a
   * progress label while an export is running.
   */
  protected readonly exportLabel = computed(() => {
    if (this.editor.isExporting()) {
      return 'Exporting…';
    }
    const format = this.editor.exportFormat();
    return EXPORT_MENU_ITEMS.find((item) => item.value === format)?.label ?? 'Export';
  });

  /** True while exporting is impossible: no image, or an operation in flight. */
  protected readonly isExportDisabled = computed(
    () => !this.editor.hasImage() || this.editor.isBusy(),
  );

  /** True when the JPEG-only quality slider applies. */
  protected readonly isJpegSelected = computed(() => this.editor.exportFormat() === 'jpeg');

  /** JPEG quality rendered as a whole percentage. */
  protected readonly jpegQualityPercent = computed(() =>
    Math.round(this.editor.jpegQuality() * 100),
  );

  /** One-line summary of the last successful export, or null when none. */
  protected readonly lastExportSummary = computed(() => {
    const result = this.editor.lastExport();
    if (result === null) {
      return null;
    }
    return `Saved · ${formatBytes(result.sizeBytes)}`;
  });

  /**
   * Output-size line. Export always renders at the source image's own
   * resolution — there is no output-size choice to make — so the panel states
   * the size rather than offering it.
   */
  protected readonly outputSizeLabel = computed(() => {
    const meta = this.editor.imageMeta();
    return meta === null ? null : `${meta.width} × ${meta.height} px · same as source`;
  });

  /** Exports the current image using the already-selected format. */
  protected onExport(): void {
    void this.editor.exportCurrent();
  }

  /**
   * Applies the format chosen from the dropdown and exports immediately —
   * picking a menu entry is an action, not just a preference. The format is
   * committed before {@link SpikeEditorService.exportCurrent} reads it.
   *
   * @param value The chosen menu item value.
   */
  protected onMenuSelect(value: string): void {
    this.editor.exportFormat.set(EXPORT_FORMAT_BY_MENU_VALUE[value]);
    void this.editor.exportCurrent();
  }

  /**
   * Updates the JPEG encoder quality.
   * @param value New quality in [JPEG_QUALITY_MIN, JPEG_QUALITY_MAX].
   */
  protected onJpegQualityChange(value: number): void {
    this.editor.jpegQuality.set(value);
  }
}
