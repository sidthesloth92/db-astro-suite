import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PreviewContextBarComponent } from '@db-astro-suite/ui';
import { CaptionSectionComponent } from '../../components/caption-section/caption-section';
import { CardPreviewComponent } from '../../components/card-preview/card-preview';
import { StellarMapPreviewComponent } from '../../components/stellar-map-preview/stellar-map-preview';
import { CardDataService } from '../../services/card-data.service';
import { AstrogramTopBarComponent } from '../astrogram-top-bar/astrogram-top-bar.component';
import { InspectorPanelHostComponent } from '../inspector-panel-host/inspector-panel-host.component';

/**
 * Desktop shell layout: top bar above, preview + caption in the centre,
 * and the right-side inspector host. Export is owned by the card-preview
 * download FAB; no top-bar export wiring lives here anymore.
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

  /** Dimensions string shown in the preview context bar. */
  readonly dimensions = computed(() => {
    const ratio =
      this.activeMode() === 'infographic'
        ? this.dataService.cardData().aspectRatio
        : this.dataService.stellarMapData().aspectRatio;
    if (ratio === '3:4') {
      return '1080 × 1440';
    }
    if (ratio === '4:5') {
      return '1080 × 1350';
    }
    return 'Auto source size';
  });
}
