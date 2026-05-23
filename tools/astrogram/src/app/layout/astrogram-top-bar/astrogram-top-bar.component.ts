import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  HeaderComponent,
  LayoutIconComponent,
  SegmentedTabsComponent,
  SparklesIconComponent,
  type SegmentedTabOption,
} from '@db-astro-suite/ui';
import packageJson from '../../../../package.json';
import {
  ASTROGRAM_ABOUT_HREF,
  ASTROGRAM_BRAND_HREF,
  ASTROGRAM_GITHUB_HREF,
  ASTROGRAM_LOGO_SRC,
  ASTROGRAM_TAGLINE,
  ASTROGRAM_TITLE,
} from '../../constants/branding.constants';
import { CardDataService } from '../../services/card-data.service';
import type { AstrogramTabId } from './astrogram-top-bar.types';

/** Mode identifier emitted by the top bar tabs (mirrors `CardDataService.activeMode`). */
export type AstrogramTopBarMode = 'infographic' | 'stellar-map';

/**
 * Astrogram top bar — a thin composition of the shared `<dba-ui-header>`
 * with a `<dba-ui-segmented-tabs>` slotted into the centre for mode
 * switching between Infographic / Stellar Map. Mode state is owned by
 * `CardDataService.activeMode`. The Export CTA has been dropped from
 * this surface — the card-preview download FAB owns export now.
 */
@Component({
  selector: 'dba-ag-top-bar',
  standalone: true,
  imports: [
    HeaderComponent,
    SegmentedTabsComponent,
    LayoutIconComponent,
    SparklesIconComponent,
  ],
  templateUrl: './astrogram-top-bar.component.html',
  styleUrl: './astrogram-top-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AstrogramTopBarComponent {
  private readonly dataService = inject(CardDataService);

  /** When true, applies the compact paddings and shorter tab labels for mobile. */
  readonly isCompact = input<boolean>(false);

  /** App version surfaced as a small pill next to the brand title. */
  readonly version: string = packageJson.version || '0.0.0';

  /** Brand title (wordmark) forwarded to `<dba-ui-header>`. */
  readonly title = ASTROGRAM_TITLE;
  /** Brand tagline rendered on desktop next to the wordmark. */
  readonly tagline = ASTROGRAM_TAGLINE;
  /** Brand logo image path. */
  readonly logoSrc = ASTROGRAM_LOGO_SRC;
  /** Brand link target (logo + title). */
  readonly logoLink = ASTROGRAM_BRAND_HREF;
  /** External GitHub link rendered as an icon button on the right. */
  readonly githubLink = ASTROGRAM_GITHUB_HREF;
  /** External "About me" link rendered next to the GitHub icon. */
  readonly aboutLink = ASTROGRAM_ABOUT_HREF;

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
}
