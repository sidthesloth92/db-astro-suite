import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ConstellationLoaderComponent, TextButtonComponent } from '@db-astro-suite/ui';
import { SpikeEditorService } from '../../services/spike-editor.service';

/**
 * Right-hand controls panel (M1 slim version). Shows the loaded image's
 * metadata and star count, the Export PNG action, its error state, and a
 * "New image" reset. Presets, sliders, the spike-count toggle, and JPEG
 * quality land here in M2.
 */
@Component({
  selector: 'dba-as-side-panel',
  standalone: true,
  imports: [ConstellationLoaderComponent, TextButtonComponent],
  templateUrl: './side-panel.html',
  styleUrl: './side-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidePanel {
  /** Shared editor state — image meta, stars, and export state. */
  protected readonly editor = inject(SpikeEditorService);

  /** Export button label — switches to a progress label while exporting. */
  protected readonly exportLabel = computed(() =>
    this.editor.isExporting() ? 'Exporting…' : 'Export PNG',
  );

  /** True while exporting is impossible: no image, or an operation in flight. */
  protected readonly isExportDisabled = computed(
    () => !this.editor.hasImage() || this.editor.isBusy(),
  );

  /**
   * Star-count line. Reports progress while detection is in flight so the
   * panel never claims "0 stars detected" before the run has finished.
   */
  protected readonly starSummary = computed(() =>
    this.editor.isDetecting()
      ? 'Detecting stars…'
      : `${this.editor.allStars().length} stars detected`,
  );

  /** Runs the full-resolution export with the current settings. */
  protected onExport(): void {
    void this.editor.exportCurrent();
  }

  /** Clears the loaded image and resets the editor to its empty state. */
  protected onClearImage(): void {
    this.editor.clearImage();
  }
}
