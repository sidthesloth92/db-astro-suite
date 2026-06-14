import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConstellationFieldComponent } from '@db-astro-suite/ui';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { CelestoryWordmarkComponent } from '../../components/celestory-wordmark/celestory-wordmark.component';
import { JourneyViewComponent } from '../../components/journey-view/journey-view.component';
import type { StoryDetails } from '../../models/api.model';
import type { JourneyState } from '../../models/journey.types';
import type { PortfolioState } from '../../models/portfolio.types';
import { SAMPLE_HANDLE, SAMPLE_LEDGER } from '../../models/sample-ledger.constants';
import { StoryService } from '../../services/story.service';
import { formatHours } from '../../utils/format.util';

/**
 * Public profile at /user/<handle>. Renders the shared journey shell in the
 * Demo state for /user/vera (bundled sample, no network call) or the Published
 * state for any other handle (loaded from the API, SSR-friendly). Sets per-handle
 * OpenGraph meta (from the ledger summary) so shared links unfurl well.
 */
@Component({
  selector: 'dba-celestory-portfolio',
  standalone: true,
  imports: [
    RouterLink,
    ConstellationFieldComponent,
    JourneyViewComponent,
    CelestoryWordmarkComponent,
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

  /** The bundled demo journey, served reload-safe at /user/vera. */
  private readonly sampleStory: StoryDetails = {
    handle: SAMPLE_HANDLE,
    ledger: SAMPLE_LEDGER,
    createdAt: SAMPLE_LEDGER.generatedAt,
  };

  /** Load state for the resolved handle. */
  protected readonly state = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('handle') ?? ''),
      switchMap((handle) =>
        handle === SAMPLE_HANDLE
          ? of<PortfolioState>({ status: 'loaded', story: this.sampleStory })
          : this.storyService.getStory(handle).pipe(
              map((story): PortfolioState => ({ status: 'loaded', story })),
              catchError(() => of<PortfolioState>({ status: 'error' })),
              startWith<PortfolioState>({ status: 'loading' }),
            ),
      ),
    ),
    { initialValue: { status: 'loading' } satisfies PortfolioState },
  );

  /** The loaded story, or null while loading / on error. */
  protected readonly story = computed<StoryDetails | null>(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.story : null;
  });

  /** Whether the bundled demo is being shown. */
  protected readonly isSample = computed(() => this.story()?.handle === SAMPLE_HANDLE);

  /** Journey state for the shared shell: Demo for the sample, else Published. */
  protected readonly journeyState = computed<JourneyState>(() =>
    this.isSample() ? 'demo' : 'published',
  );

  constructor() {
    // Apply per-handle OG meta once the story resolves (runs during SSR too).
    effect(() => {
      const story = this.story();
      if (story) {
        this.applyMeta(story);
      }
    });
  }

  /** Sets the document title + OG/description tags from the ledger summary. */
  private applyMeta(story: StoryDetails): void {
    const summary = story.ledger.summary;
    const hours = formatHours(summary.totalIntegrationSeconds);
    const title = `${story.handle} · ${hours}h under the stars — Celestory`;
    const description = `${summary.objectCount} targets · ${hours}h integration · ${summary.nightCount} nights imaged.`;
    this.title.setTitle(title);
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:description', content: description });
  }
}
