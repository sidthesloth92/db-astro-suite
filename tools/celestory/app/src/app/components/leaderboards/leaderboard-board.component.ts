import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { filterColor, filterColorMap } from '../../utils/filter-color.util';
import { formatCount } from '../../utils/format.util';
import { leaderboardIconSvg } from '../../utils/leaderboard-icon.util';
import { safeSvg } from '../../utils/safe-svg.util';
import type { BoardView } from '../../models/leaderboard-board.model';
import type { LeaderboardEntry } from '../../models/leaderboards.model';
import type { MeRow } from '../../models/me-row.model';

/**
 * Presentational board renderer: header, podium (#1 hero + #2/#3), ranked list,
 * and the bottom slot — the authenticated viewer's personal row, or a Publish
 * CTA. Renders the API's render-ready fields verbatim (only numeric formatting).
 */
@Component({
  selector: 'dba-leaderboard-board',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './leaderboard-board.component.html',
  styleUrl: './leaderboard-board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardBoardComponent {
  private readonly sanitizer = inject(DomSanitizer);

  /** The board's view chrome (title/blurb/accent/icon). */
  readonly view = input.required<BoardView>();
  /** Render-ready ranked entries for the active scope. */
  readonly entries = input.required<LeaderboardEntry[]>();
  /** The authenticated viewer's personal row, or null to show the Publish CTA. */
  readonly myRow = input<MeRow | null>(null);
  /** Whether the board is currently loading. */
  readonly loading = input(false);
  /** Whether the board failed to load. */
  readonly hasError = input(false);

  /** Number formatter for entry values (thousands separators). */
  protected readonly fmt = formatCount;

  /** The board heading icon as trusted SVG. */
  protected readonly headIcon = computed<SafeHtml>(() =>
    safeSvg(this.sanitizer, leaderboardIconSvg(this.view().icon)),
  );

  /** Top three entries (the podium). */
  protected readonly podium = computed<LeaderboardEntry[]>(() =>
    this.entries().slice(0, 3),
  );

  /** Entries ranked 4..N (the list). */
  protected readonly list = computed<LeaderboardEntry[]>(() =>
    this.entries().slice(3),
  );

  /** Whether to show a colour swatch (the filters board only). */
  protected readonly showSwatch = computed(() => this.view().id === 'filter');

  /** Distinct colours for the board's unrecognised filter labels. */
  private readonly swatchColors = computed(() =>
    filterColorMap(this.entries().map((e) => e.label)),
  );

  /** Brand colour for a filter swatch (presentation/theme). */
  protected swatch(label: string): string {
    return filterColor(label, this.swatchColors());
  }
}
