import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import {
  AnalyticsService,
  IconComponent,
  InspectorSectionComponent,
  downloadIcon,
  shareIcon,
} from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';
import { ExportCoordinatorService } from '../../services/export-coordinator.service';

/** Format option presented in the radio list. */
interface ExportFormatOption {
  readonly id: 'jpeg' | 'png' | 'webp';
  readonly label: string;
  readonly note: string;
}

/** Share target presented in the 2x2 grid. */
interface ShareTarget {
  readonly id: 'instagram' | 'twitter' | 'pinterest' | 'link';
  readonly label: string;
  readonly disabled: boolean;
}

/**
 * Inspector panel that surfaces export-format choices and share targets.
 * The actual export work lives in `BaseCardPreviewComponent.exportCard()`
 * (modern-screenshot pipeline). Format selections persist on
 * `CardDataService.exportFormat` and are consumed at export time.
 */
@Component({
  selector: 'dba-ag-export-panel',
  standalone: true,
  imports: [InspectorSectionComponent, IconComponent],
  templateUrl: './export-panel.component.html',
  styleUrls: ['./export-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportPanelComponent {
  private readonly document = inject(DOCUMENT);
  private readonly cardDataService = inject(CardDataService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly exportCoordinator = inject(ExportCoordinatorService);

  /** When true, hides the inspector-section header (used by the mobile shell where the sheet already shows a title). */
  readonly hideHeader = input<boolean>(false);

  /** Download glyph (section title + Export CTA). */
  protected readonly downloadIcon = downloadIcon;
  /** Share glyph used in the Share-to section title. */
  protected readonly shareIcon = shareIcon;

  /** Current format choice mirrored from `CardDataService.exportFormat`. */
  readonly format = computed(() => this.cardDataService.exportFormat());

  /**
   * True when the active preview surface has something exportable.
   * Stellar map exports require a selected background image; infographic
   * always exports the card regardless. Disables the Export CTA when
   * false so users don't fire an empty capture.
   */
  readonly canExport = computed(() => {
    if (this.cardDataService.activeMode() !== 'stellar-map') {
      return true;
    }
    return !!this.cardDataService.stellarMapData().backgroundImage;
  });

  /** Transient flag — true for the brief window after a successful link copy. */
  readonly linkCopied = signal(false);

  /** Format options shown in the radio list. */
  readonly formats: readonly ExportFormatOption[] = [
    { id: 'jpeg', label: 'JPEG', note: 'Default · smaller file' },
    { id: 'png', label: 'PNG', note: 'Best quality · larger file' },
    { id: 'webp', label: 'WebP', note: 'Modern format · smaller file' },
  ];

  /**
   * Share targets shown in the 2x2 grid. Instagram has no public web-share
   * intent, so it remains disabled (user can Export + paste manually).
   */
  readonly shareTargets: readonly ShareTarget[] = [
    { id: 'instagram', label: 'Instagram', disabled: true },
    { id: 'twitter', label: 'Twitter / X', disabled: false },
    { id: 'pinterest', label: 'Pinterest', disabled: false },
    { id: 'link', label: 'Direct link', disabled: false },
  ];

  /** Picks an export format and persists it on the service. */
  selectFormat(id: ExportFormatOption['id']): void {
    this.cardDataService.exportFormat.set(id);
    this.analyticsService.trackSettingChanged('export_format', id);
  }

  /** Handles a share-target click via web intents / clipboard. */
  selectShareTarget(target: ShareTarget): void {
    if (target.disabled) {
      return;
    }
    this.analyticsService.trackEvent('astrogram_share_click', { target: target.id });
    const win = this.document.defaultView;
    const url = win?.location?.href ?? '';
    const title = 'My astrophotography card';
    switch (target.id) {
      case 'twitter': {
        const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        win?.open(intent, '_blank', 'noopener');
        return;
      }
      case 'pinterest': {
        const intent = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}`;
        win?.open(intent, '_blank', 'noopener');
        return;
      }
      case 'link': {
        this.copyToClipboard(url);
        return;
      }
      default:
        return;
    }
  }

  /** Triggers the active preview's export pipeline via the coordinator. */
  triggerExport(): void {
    if (!this.canExport()) {
      return;
    }
    this.exportCoordinator.trigger();
  }

  /** Best-effort clipboard copy; surfaces success via the `linkCopied` signal. */
  private copyToClipboard(text: string): void {
    const clipboard = this.document.defaultView?.navigator?.clipboard;
    if (!clipboard) {
      return;
    }
    clipboard.writeText(text).then(
      () => {
        this.linkCopied.set(true);
        setTimeout(() => this.linkCopied.set(false), 2000);
      },
      // Clipboard rejection is non-fatal — the user can still copy manually.
      () => undefined,
    );
  }
}
