import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import {
  DownloadIconComponent,
  LayoutIconComponent,
  SparklesIconComponent,
  SegmentedTabsComponent,
  TopBarComponent,
  type SegmentedTabOption,
} from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';

/** Mode identifier emitted by the top bar tabs. */
export type AstrogramTopBarMode = 'infographic' | 'stellar-map';

/** Tab option id used by the segmented tabs primitive. */
type AstrogramTabId = 'infographic' | 'stellar';

/**
 * Astrogram-specific composition of the libs/ui `<dba-ui-top-bar>`. Populates
 * the brand slot with the gradient avatar and "astrogram" wordmark, the tabs
 * slot with mode switching between Infographic / Stellar Map (bound to
 * `CardDataService.activeMode`), and the actions slot with the Export CTA.
 */
@Component({
  selector: 'dba-ag-top-bar',
  standalone: true,
  imports: [
    TopBarComponent,
    SegmentedTabsComponent,
    LayoutIconComponent,
    SparklesIconComponent,
    DownloadIconComponent,
  ],
  templateUrl: './astrogram-top-bar.component.html',
  styleUrls: ['./astrogram-top-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AstrogramTopBarComponent {
  private readonly dataService = inject(CardDataService);

  /** When true, applies the compact paddings and shorter labels for mobile. */
  readonly isCompact = input<boolean>(false);

  /** Emitted when the user clicks the Export CTA. The parent owns the export. */
  readonly exportClicked = output<void>();

  /** Active tab id derived from the shared `CardDataService.activeMode` signal. */
  readonly activeTabId = computed<AstrogramTabId>(() =>
    this.dataService.activeMode() === 'infographic' ? 'infographic' : 'stellar',
  );

  /** Tab options shown in the segmented tabs primitive (label varies with compact). */
  readonly tabOptions = computed<readonly SegmentedTabOption[]>(() => {
    const compact = this.isCompact();
    return [
      { id: 'infographic', label: compact ? 'Info' : 'Infographic' },
      { id: 'stellar', label: compact ? 'Stellar' : 'Stellar Map' },
    ];
  });

  /** Handles tab selection from the segmented tabs primitive. */
  onTabChange(id: string): void {
    this.dataService.activeMode.set(id === 'stellar' ? 'stellar-map' : 'infographic');
  }

  /** Forwards the Export click to the parent shell. */
  onExportClick(): void {
    this.exportClicked.emit();
  }
}
