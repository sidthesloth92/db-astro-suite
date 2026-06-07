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
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { StoryStatsComponent } from '../components/story-stats/story-stats.component';
import type { StoryDetails } from '../models/api.model';
import { StoryService } from '../services/story.service';
import { formatHours } from '../utils/format.util';

/** Async load state for the portfolio. */
type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; story: StoryDetails }
  | { status: 'error' };

/**
 * Public portfolio at /<handle>. Loads the story from the API (SSR-friendly via
 * the request-context interceptor), renders the shared stats, and sets
 * per-handle OpenGraph meta so shared links unfurl with the right title/desc.
 */
@Component({
  selector: 'dba-celestory-portfolio',
  standalone: true,
  imports: [StoryStatsComponent, RouterLink],
  templateUrl: './[handle].page.html',
  styleUrl: './[handle].page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PortfolioPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly storyService = inject(StoryService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  /** Load state for the resolved handle. */
  protected readonly state = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('handle') ?? ''),
      switchMap((handle) =>
        this.storyService.getStory(handle).pipe(
          map((story): LoadState => ({ status: 'loaded', story })),
          catchError(() => of<LoadState>({ status: 'error' })),
          startWith<LoadState>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } satisfies LoadState },
  );

  /** The loaded story, or null while loading / on error. */
  protected readonly story = computed<StoryDetails | null>(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.story : null;
  });

  constructor() {
    // Apply per-handle OG meta once the story resolves (runs during SSR too).
    effect(() => {
      const story = this.story();
      if (story) {
        this.applyMeta(story);
      }
    });
  }

  private applyMeta(story: StoryDetails): void {
    const hours = formatHours(story.stats.totalIntegrationSeconds);
    const title = `${story.handle} · ${hours}h under the stars — Celestory`;
    const description = `${story.stats.objectCount} targets · ${hours}h integration · ${story.stats.nightCount} nights imaged.`;
    this.title.setTitle(title);
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:description', content: description });
  }
}
