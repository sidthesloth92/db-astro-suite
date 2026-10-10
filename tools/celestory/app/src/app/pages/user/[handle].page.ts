import { RouteMeta } from '@analogjs/router';
import { injectBaseURL } from '@analogjs/router/tokens';
import { DOCUMENT } from '@angular/common';
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
import { setCanonicalUrl } from '../../utils/canonical.util';
import { profileJsonLd } from '../../utils/json-ld.util';
import { resolveOrigin } from '../../utils/origin.util';
import { setStructuredData } from '../../utils/structured-data.util';
import { applySocialMeta } from '../../utils/social-meta.util';
import { profileShareMeta, type ProfileShareFocus } from '../../utils/profile-share-meta.util';

/** SSR baseline for the dynamic profile route — overwritten per-handle once the
 * story resolves; covers the loading state before the API responds. */
export const routeMeta: RouteMeta = {
  title: "Celestory — A stargazer's journey",
  meta: [
    {
      name: 'description',
      content:
        'A public astrophotography journey on Celestory — every target, every filter, every photon.',
    },
  ],
};

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
  private readonly doc = inject(DOCUMENT);
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

  /** The focused target / equipment (from `?target=` / `?equipment=`), driving the OG image. */
  private readonly focus = toSignal(
    this.route.queryParamMap.pipe(
      map((pm) => ({ target: pm.get('target'), equipment: pm.get('equipment') })),
    ),
    { initialValue: { target: null as string | null, equipment: null as string | null } },
  );

  /** Total integration seconds for the reveal's hours count-up (0 until loaded). */
  protected readonly introSeconds = computed(
    () => this.profile()?.story.summary.totalIntegrationSeconds ?? 0,
  );

  constructor() {
    // Arm the reveal once on the browser (post-hydration), so SSR/crawlers still
    // get the content directly. It then plays as the loading screen and its hours
    // count-up fills in when the story resolves.
    afterNextRender(() => this.introActive.set(true));

    // Apply per-handle OG meta once the story resolves (runs during SSR too),
    // focused on the target/equipment named in the URL query when present. An
    // unknown handle gets a noindex "not found" head so it isn't indexed.
    effect(() => {
      const state = this.state();
      if (state.status === 'loaded') {
        this.applyMeta(state.profile, this.focus());
      } else if (state.status === 'error') {
        this.applyNotFoundMeta();
      }
    });
  }

  /** The reveal finished — drop the intro overlay to show the profile beneath. */
  protected onIntroDone(): void {
    this.introActive.set(false);
  }

  /** Sets the document title + full OG/Twitter unfurl tags, the canonical link
   * and ProfilePage JSON-LD, focused on the target/equipment in the URL query
   * when present, else the whole profile. */
  private applyMeta(profile: StoryDetails, focus: ProfileShareFocus): void {
    const meta = profileShareMeta(profile, focus, resolveOrigin(this.baseUrl));
    this.title.setTitle(meta.title);
    this.meta.removeTag('name="robots"');
    applySocialMeta(this.meta, meta);
    setCanonicalUrl(this.doc, meta.url ?? null);
    setStructuredData(this.doc, profileJsonLd(profile, meta.url ?? null));
  }

  /** Marks an unknown handle noindex with a clear title and no structured data. */
  private applyNotFoundMeta(): void {
    this.title.setTitle('Celestory — Profile not found');
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
    setStructuredData(this.doc, null);
  }
}
