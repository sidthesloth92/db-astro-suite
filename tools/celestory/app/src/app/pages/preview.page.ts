import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnimatedStarryBackgroundComponent } from '@db-astro-suite/ui';
import { StoryStatsComponent } from '../components/story-stats/story-stats.component';
import { PreviewStore } from '../services/preview-store.service';

/**
 * ① Visualise — renders the staged ledger entirely client-side. Nothing was
 * uploaded; a hard reload clears the in-memory store and shows the empty state.
 */
@Component({
  selector: 'dba-celestory-preview',
  standalone: true,
  imports: [StoryStatsComponent, RouterLink, AnimatedStarryBackgroundComponent],
  templateUrl: './preview.page.html',
  styleUrl: './preview.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PreviewPageComponent {
  private readonly previewStore = inject(PreviewStore);

  /** The ledger staged by the landing page, or null on a fresh load. */
  protected readonly ledger = this.previewStore.ledger;
}
