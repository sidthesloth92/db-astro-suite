import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConstellationFieldComponent } from '@db-astro-suite/ui';
import { CelestoryWordmarkComponent } from '../components/celestory-wordmark/celestory-wordmark.component';
import { JourneyViewComponent } from '../components/journey-view/journey-view.component';
import { ProcessingRevealComponent } from '../components/processing-reveal/processing-reveal.component';
import { PreviewStore } from '../services/preview-store.service';

/**
 * Private Preview — renders the staged ledger entirely client-side in the shared
 * journey shell (banner + actions). Nothing was uploaded; a hard reload clears
 * the in-memory store and shows the empty state.
 */
@Component({
  selector: 'dba-celestory-preview',
  standalone: true,
  imports: [
    RouterLink,
    ConstellationFieldComponent,
    JourneyViewComponent,
    CelestoryWordmarkComponent,
    ProcessingRevealComponent,
  ],
  templateUrl: './preview.page.html',
  styleUrl: './preview.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PreviewPageComponent {
  private readonly previewStore = inject(PreviewStore);

  /** The ledger staged by the landing page, or null on a fresh load. */
  protected readonly ledger = this.previewStore.ledger;
  /** Plays the branded reveal once, right after an upload. */
  protected readonly revealing = signal(false);

  constructor() {
    afterNextRender(() => {
      if (this.previewStore.fresh() && this.ledger()) {
        // The "Create" flow opens the publish modal first (the full-screen
        // reveal would hide it), so the branded reveal plays only on the
        // visualize-only path. Read before journey-view consumes autoPublish.
        if (!this.previewStore.autoPublish()) {
          this.revealing.set(true);
        }
        this.previewStore.fresh.set(false);
      }
    });
  }
}
