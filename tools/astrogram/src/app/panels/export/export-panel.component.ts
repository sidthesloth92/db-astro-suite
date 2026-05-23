import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import {
  DownloadIconComponent,
  InspectorSectionComponent,
  ShareIconComponent,
} from '@db-astro-suite/ui';

interface ExportFormat {
  readonly id: string;
  readonly label: string;
  readonly note: string;
}

interface ShareTarget {
  readonly id: string;
  readonly label: string;
}

/**
 * Inspector panel that surfaces export-format choices and share targets.
 * The actual export work lives in `BaseCardPreviewComponent.exportCard`
 * (modern-screenshot pipeline). Today every choice maps to the existing
 * JPG export — the format radio is a forward-looking placeholder.
 */
@Component({
  selector: 'dba-ag-export-panel',
  standalone: true,
  imports: [InspectorSectionComponent, DownloadIconComponent, ShareIconComponent],
  templateUrl: './export-panel.component.html',
  styleUrls: ['./export-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportPanelComponent {
  /** Emitted when the user clicks the in-panel Export CTA. The parent shell triggers the actual export. */
  readonly exportRequested = output<void>();

  /** Local UI selection of the requested format. */
  readonly format = signal<string>('jpeg');

  /** Local UI selection of the share target (none = direct download). */
  readonly shareTarget = signal<string | null>(null);

  /** Format options shown in the radio list. */
  readonly formats: readonly ExportFormat[] = [
    { id: 'jpeg', label: 'JPEG', note: 'Default export · current pipeline' },
    { id: 'png', label: 'PNG', note: 'Best quality · larger file' },
    { id: 'webp', label: 'WebP', note: 'Modern format · smaller file' },
  ];

  /** Share targets shown in the 2x2 grid. */
  readonly shareTargets: readonly ShareTarget[] = [
    { id: 'instagram', label: 'Instagram' },
    { id: 'twitter', label: 'Twitter / X' },
    { id: 'pinterest', label: 'Pinterest' },
    { id: 'link', label: 'Direct link' },
  ];

  /** Picks an export format. */
  selectFormat(id: string): void {
    this.format.set(id);
  }

  /** Picks a share target (or deselects when re-clicking the active one). */
  selectShareTarget(id: string): void {
    this.shareTarget.update((current) => (current === id ? null : id));
  }

  /** Emits the export request to the parent shell. */
  triggerExport(): void {
    this.exportRequested.emit();
  }
}
