import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { PreviewContextBarComponent } from '@db-astro-suite/ui';
import { CaptionSectionComponent } from '../../components/caption-section/caption-section';
import { CardPreviewComponent } from '../../components/card-preview/card-preview';
import { StellarMapPreviewComponent } from '../../components/stellar-map-preview/stellar-map-preview';
import { CardDataService } from '../../services/card-data.service';
import { AstrogramTopBarComponent } from '../astrogram-top-bar/astrogram-top-bar.component';
import { InspectorPanelHostComponent } from '../inspector-panel-host/inspector-panel-host.component';

/**
 * Desktop shell layout: top bar above, preview + caption in the centre,
 * and the right-side inspector host. The top bar's Export CTA forwards
 * to whichever preview is currently active.
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

  /** Reference to the infographic card preview (resolved by template ref). */
  private readonly cardPreview = viewChild<CardPreviewComponent>(CardPreviewComponent);
  /** Reference to the stellar-map preview. */
  private readonly stellarPreview = viewChild<StellarMapPreviewComponent>(
    StellarMapPreviewComponent,
  );

  /** Triggers the export pipeline on whichever preview is active. */
  exportCurrent(): void {
    if (this.activeMode() === 'infographic') {
      this.cardPreview()?.exportCard();
    } else {
      this.stellarPreview()?.exportCard();
    }
  }
}
