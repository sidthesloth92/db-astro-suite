import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, type SafeHtml, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ConstellationFieldComponent } from '@db-astro-suite/ui';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { CelestoryWordmarkComponent } from '../components/celestory-wordmark/celestory-wordmark.component';
import { LeaderboardBoardComponent } from '../components/leaderboards/leaderboard-board.component';
import {
  BOARD_VIEWS,
  SCOPE_OPTIONS,
} from '../components/leaderboards/leaderboards.constants';
import { filterColor } from '../utils/filter-color.util';
import { formatCompact, formatCount } from '../utils/format.util';
import { leaderboardIconSvg } from '../utils/leaderboard-icon.util';
import { leaderboardBackdrop, motifSvg } from '../utils/leaderboard-motif.util';
import { safeSvg } from '../utils/safe-svg.util';
import { LeaderboardsService } from '../services/leaderboards.service';
import { SessionStore } from '../services/session-store.service';
import { StoryService } from '../services/story.service';
import type {
  BoardId,
  BoardLoadState,
  BoardView,
} from '../models/leaderboard-board.model';
import type { LeaderboardEntry, Scope } from '../models/leaderboards.model';
import type { MeRow } from '../models/me-row.model';

/**
 * Community leaderboards console at /leaderboards. Renders nine boards (tabs) ×
 * three time scopes, all from the render-ready board facade. The authenticated
 * viewer's personal row is fetched browser-only (owner session token); otherwise
 * a Publish CTA is shown. Pure presentation — no data mapping in the UI.
 */
@Component({
  selector: 'dba-celestory-leaderboards',
  standalone: true,
  imports: [
    RouterLink,
    ConstellationFieldComponent,
    CelestoryWordmarkComponent,
    LeaderboardBoardComponent,
  ],
  templateUrl: './leaderboards.page.html',
  styleUrl: './leaderboards.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaderboardsPageComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly service = inject(LeaderboardsService);
  private readonly storyService = inject(StoryService);
  private readonly session = inject(SessionStore);
  private readonly title = inject(Title);

  /** Number formatters exposed to the template. */
  protected readonly fmt = formatCount;

  /** The active board id and time scope. */
  protected readonly boardId = signal<BoardId>('hours');
  protected readonly scope = signal<Scope>('all');

  /** Flips true after first browser render (gates sessionStorage-dependent work). */
  private readonly browser = signal(false);

  /** Tabs (board chrome + pre-trusted icon) and scope options for the template. */
  protected readonly tabs = BOARD_VIEWS.map((view) => ({
    view,
    icon: safeSvg(this.sanitizer, leaderboardIconSvg(view.icon)),
  }));
  protected readonly scopes = SCOPE_OPTIONS;
  protected readonly boardCount = BOARD_VIEWS.length;

  /** The active board's view chrome. */
  protected readonly activeView = computed<BoardView>(
    () => BOARD_VIEWS.find((v) => v.id === this.boardId()) ?? BOARD_VIEWS[0],
  );

  /** Active board fetch, re-run on board/scope change (SSR-safe, public). */
  private readonly boardState = toSignal(
    combineLatest([toObservable(this.boardId), toObservable(this.scope)]).pipe(
      switchMap(([id, scope]) =>
        this.service.getBoard(id, scope).pipe(
          map((board): BoardLoadState => ({ status: 'loaded', board })),
          catchError(() => of<BoardLoadState>({ status: 'error' })),
          startWith<BoardLoadState>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } satisfies BoardLoadState },
  );

  /** Catch errors into the loaded/error/loading discriminant. */
  protected readonly entries = computed<LeaderboardEntry[]>(() => {
    const state = this.boardState();
    return state.status === 'loaded' ? state.board.entries : [];
  });
  protected readonly loading = computed(() => this.boardState().status === 'loading');
  protected readonly hasError = computed(() => this.boardState().status === 'error');

  /** The viewer's personal row (browser-only; null when unauthenticated). */
  protected readonly myRow = toSignal<MeRow | null>(
    combineLatest([
      toObservable(this.boardId),
      toObservable(this.scope),
      toObservable(this.browser),
    ]).pipe(
      switchMap(([id, scope, ready]) => {
        const token = this.session.token();
        if (!ready || !token) {
          return of<MeRow | null>(null);
        }
        return this.service.getMyRow(id, scope, token);
      }),
    ),
    { initialValue: null },
  );

  /** Community aggregates for the hero stats pill. */
  private readonly stats = toSignal(this.storyService.getCommunityStats(), {
    initialValue: null,
  });
  protected readonly statImagers = computed(() => {
    const s = this.stats();
    return s ? formatCount(s.liveCount) : '—';
  });
  protected readonly statHours = computed(() => {
    const s = this.stats();
    return s ? formatCompact(Math.round(s.totalIntegrationSeconds / 3600)) : '—';
  });

  /** Themed backdrop gradient + motif for the active board. */
  protected readonly backdrop = computed(() =>
    leaderboardBackdrop(this.activeView().accentRgb, true),
  );
  protected readonly motif = computed<SafeHtml>(() => {
    const view = this.activeView();
    const swatches =
      view.id === 'filter'
        ? this.entries().map((entry) => filterColor(entry.label))
        : [];
    return safeSvg(
      this.sanitizer,
      motifSvg(view.motif, view.accent, view.accentRgb, swatches),
    );
  });

  constructor() {
    this.title.setTitle('Leaderboards · Celestory');
    afterNextRender(() => this.browser.set(true));
  }

  /** Switch the active board. */
  protected selectBoard(id: BoardId): void {
    this.boardId.set(id);
  }

  /** Switch the active time scope. */
  protected selectScope(scope: Scope): void {
    this.scope.set(scope);
  }
}
