import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IconButtonComponent,
  IconComponent,
  checkIcon,
  commentIcon,
  copyIcon,
  heartIcon,
  shareIcon,
} from '@db-astro-suite/ui';
import {
  calculateTotalIntegration,
  calculateTotalSeconds,
  formatDuration,
  generateInstagramCaption,
  type FilterExposure,
} from '../../models/card-data.model';
import { CardDataService } from '../../services/card-data.service';
import { PreviewLayoutService } from '../../services/preview-layout.service';

/**
 * Instagram-style preview block under the card. Renders the live caption
 * + emoji-bulleted EXPOSURE / INTEGRATION / SOFTWARE sections + hashtags.
 * The existing caption-string generator is reused for clipboard payload.
 */
@Component({
  selector: 'dba-ag-caption-section',
  standalone: true,
  imports: [IconButtonComponent, IconComponent],
  templateUrl: './caption-section.html',
  styleUrls: ['./caption-section.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaptionSectionComponent {
  private readonly dataService = inject(CardDataService);
  private readonly previewLayout = inject(PreviewLayoutService);

  /** Current card document. */
  readonly cardData = this.dataService.cardData;
  /** Displayed (post-scale) card width — used to keep the caption aligned with the scaled card. */
  readonly displayedCardWidth = this.previewLayout.displayedCardWidth;
  /** True for the brief window after a successful copy. */
  readonly copied = signal(false);

  /** Copy glyph shown on the action button by default. */
  protected readonly copyIcon = copyIcon;
  /** Check glyph shown briefly after a successful copy. */
  protected readonly checkIcon = checkIcon;
  /** Filled heart glyph for the Instagram-style "like" action. */
  protected readonly heartIcon = heartIcon;
  /** Speech-bubble glyph for the Instagram-style "comment" action. */
  protected readonly commentIcon = commentIcon;
  /** Share-arrow glyph for the Instagram-style "share" action. */
  protected readonly shareIcon = shareIcon;

  /** Caption text appended to the clipboard on copy. */
  readonly formattedCaption = computed(() => generateInstagramCaption(this.cardData()));

  /** Filters with frames > 0 — used for the integration list. */
  readonly activeFilters = computed(() =>
    this.cardData().filters.filter((f) => f.enabled && f.frames > 0),
  );

  /** Total integration formatted as "Hh Mm". */
  readonly totalIntegration = computed(() =>
    formatDuration(calculateTotalIntegration(this.cardData().filters)),
  );

  /** Per-filter integration formatted "FRAMES × SECONDS — Hh Mm". */
  filterLine(filter: FilterExposure): string {
    return `${filter.name} — ${filter.frames} × ${filter.seconds}s — ${formatDuration(
      calculateTotalSeconds(filter),
    )}`;
  }

  /** Per-filter emoji bullet matching the on-card filter palette. */
  filterEmoji(name: string): string {
    const n = name.toUpperCase();
    if (n.includes('HA')) return '🔴';
    if (n.includes('OIII')) return '🔵';
    if (n.includes('SII')) return '🟠';
    if (n.includes('L')) return '⚪';
    if (n.includes('R')) return '🟥';
    if (n.includes('G')) return '🟩';
    if (n.includes('B')) return '🟦';
    return '🎞️';
  }

  /** Writes the formatted caption to the clipboard. */
  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.formattedCaption());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard failures are non-fatal; the user can still copy manually.
    }
  }
}
