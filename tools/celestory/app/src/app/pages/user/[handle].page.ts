import { injectBaseURL } from '@analogjs/router/tokens';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConstellationFieldComponent } from '@db-astro-suite/ui';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { CelestoryWordmarkComponent } from '../../components/celestory-wordmark/celestory-wordmark.component';
import { JourneyViewComponent } from '../../components/journey-view/journey-view.component';
import { ProcessingRevealComponent } from '../../components/processing-reveal/processing-reveal.component';
import type { StoryDetails } from '../../models/api.model';
import type { PortfolioState } from '../../models/portfolio.types';
import { StoryService } from '../../services/story.service';
import { formatHours } from '../../utils/format.util';
import { resolveOrigin } from '../../utils/origin.util';
import { applySocialMeta } from '../../utils/social-meta.util';

/**
 * Public profile at /user/<handle>. Renders the shared journey shell in the
 * Published state for the handle's story loaded from the API (SSR-friendly); an
 * unknown handle shows the missing state. Sets per-handle OpenGraph meta (from the
 * story summary) so shared links unfurl well. (The bundled demo lives at /demo.)
 */
@Component({
  selector: 'dba-celestory-portfolio',
  standalone: true,
  imports: [
    RouterLink,
    ConstellationFieldComponent,
    JourneyViewComponent,
    CelestoryWordmarkComponent,
    ProcessingRevealComponent,
  ],
  templateUrl: './[handle].page.html',
  styleUrl: './[handle].page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PortfolioPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly storyService = inject(StoryService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  /** SSR base URL (origin), null in the browser — used to build absolute share URLs. */
  private readonly baseUrl = injectBaseURL();

  /** Bumped to re-fetch the profile after an owner edit (re-upload). */
  private readonly reloadTick = signal(0);

  /**
   * Plays the branded reveal once as the page's loading/intro screen (browser
   * only — SSR renders the content directly for crawlers). Shown on every direct
   * visit, not just the publish hand-off, so the URL always opens with the reveal.
   */
  protected readonly introActive = signal(false);

  /** Load state for the resolved handle (from the API), re-running on reload. */
  protected readonly state = toSignal(
    combineLatest([this.route.paramMap, toObservable(this.reloadTick)]).pipe(
      map(([params]) => params.get('handle') ?? ''),
      switchMap((handle) =>
        this.storyService.getStory(handle).pipe(
          map((profile): PortfolioState => ({ status: 'loaded', profile })),
          catchError(() => of<PortfolioState>({ status: 'error' })),
          startWith<PortfolioState>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } satisfies PortfolioState },
  );

  /** Re-fetch the profile after a successful owner edit. */
  protected refresh(): void {
    this.reloadTick.update((n) => n + 1);
  }

  /** The loaded profile, or null while loading / on error. */
  protected readonly profile = computed<StoryDetails | null>(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.profile : null;
  });

  /** Total integration seconds for the reveal's hours count-up (0 until loaded). */
  protected readonly introSeconds = computed(
    () => this.profile()?.story.summary.totalIntegrationSeconds ?? 0,
  );

  constructor() {
    // Arm the reveal once on the browser (post-hydration), so SSR/crawlers still
    // get the content directly. It then plays as the loading screen and its hours
    // count-up fills in when the story resolves.
    afterNextRender(() => this.introActive.set(true));

    // Apply per-handle OG meta once the story resolves (runs during SSR too).
    effect(() => {
      const profile = this.profile();
      if (profile) {
        this.applyMeta(profile);
      }
    });
  }

  /** The reveal finished — drop the intro overlay to show the profile beneath. */
  protected onIntroDone(): void {
    this.introActive.set(false);
  }

  /** Sets the document title + full OG/Twitter unfurl tags (with a per-profile
   * og:image) from the story summary. */
  private applyMeta(profile: StoryDetails): void {
    const summary = profile.story.summary;
    const hours = formatHours(summary.totalIntegrationSeconds);
    const title = `${profile.handle} · ${hours}h under the stars — Celestory`;
    const description = `${summary.objectCount} targets · ${hours}h integration · ${summary.nightCount} nights imaged.`;
    const origin = resolveOrigin(this.baseUrl);
    const handle = encodeURIComponent(profile.handle);
    this.title.setTitle(title);
    applySocialMeta(this.meta, {
      title,
      description,
      type: 'profile',
      url: origin ? `${origin}/user/${handle}` : undefined,
      image: origin ? `${origin}/api/og/user/${handle}` : undefined,
    });
  }
}
