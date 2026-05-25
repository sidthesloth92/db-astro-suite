import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PreviewContextBarComponent } from '@db-astro-suite/ui';
import { CaptionSectionComponent } from '../../components/caption-section/caption-section';
import { CardPreviewComponent } from '../../components/card-preview/card-preview';
import { StellarMapPreviewComponent } from '../../components/stellar-map-preview/stellar-map-preview';
import {
  MODE_TAB_OPTIONS,
  activeModeToTabId,
  tabIdToActiveMode,
} from '../../constants/mode-tabs.constants';
import {
  PREVIEW_SIZES,
  buildPreviewSizeSelectItems,
  type PreviewSizeKey,
} from '../../constants/preview-sizes.constants';
import { CardDataService } from '../../services/card-data.service';
import { AstrogramTopBarComponent } from '../astrogram-top-bar/astrogram-top-bar.component';
import { InspectorPanelHostComponent } from '../inspector-panel-host/inspector-panel-host.component';

/**
 * Desktop shell layout: top bar above, preview + caption in the centre,
 * and the right-side inspector host. The preview-context-bar above the
 * preview owns the mode tabs, size dropdown, and zoom dropdown — all of
 * which read/write `CardDataService`.
 */
@Component({
  selector: 'dba-ag-desktop-shell',
  standalone: true,
  imports: [
    AstrogramTopBarComponent,
    PreviewContextBarComponent,
    CardPreviewComponent,
    CaptionSectionComponent,
    StellarMapPreviewComponent,
    InspectorPanelHostComponent,
  ],
  templateUrl: './desktop-shell.component.html',
  styleUrls: ['./desktop-shell.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesktopShellComponent {
  private readonly dataService = inject(CardDataService);

  /** Active mode (infographic / stellar-map) mirrored for templates. */
  readonly activeMode = computed(() => this.dataService.activeMode());

  /** Size-dropdown options sourced from `PREVIEW_SIZES`. Built once. */
  readonly sizeOptions = buildPreviewSizeSelectItems();

  /** Currently selected preview-size key. */
  readonly selectedSizeKey = computed(() => this.dataService.previewSizeKey());

  /** Mode-tab options shown inside the preview-context-bar. */
  readonly modeOptions = MODE_TAB_OPTIONS;

  /** Active mode mapped to the tab id consumed by `<dba-ui-segmented-tabs>`. */
  readonly selectedModeId = computed(() => activeModeToTabId(this.dataService.activeMode()));

  /** Dimensions string shown in the preview-context-bar. */
  readonly dimensions = computed(() => {
    const meta = PREVIEW_SIZES[this.dataService.previewSizeKey()];
    if (!meta || meta.ratio === 'auto') return 'Source size';
    return `${meta.width} × ${meta.height}`;
  });

  /** Forwards the toolbar size-dropdown change into `CardDataService`. */
  onSizeChange(key: string): void {
    this.dataService.setPreviewSize(key as PreviewSizeKey);
  }

  /** Forwards the toolbar mode-tab change into `CardDataService`. */
  onModeChange(id: string): void {
    this.dataService.activeMode.set(tabIdToActiveMode(id));
  }
}
