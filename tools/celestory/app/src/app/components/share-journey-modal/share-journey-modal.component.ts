import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import type { JourneyState } from '../../models/journey.types';
import { ASSET_KINDS } from '../../models/share.constants';

/**
 * Unified "Share Your Journey" modal. Section 1 (Download Assets) offers
 * social-ready exports — only "Story Slides" is wired (opens its flow); the rest
 * are placeholder shells pending the design. Section 2 (Publish Profile) is shown
 * only in the Private Preview state, presenting publishing as an advanced share
 * option rather than account creation.
 */
@Component({
  selector: 'dba-share-journey-modal',
  standalone: true,
  templateUrl: './share-journey-modal.component.html',
  styleUrl: './share-journey-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareJourneyModalComponent {
  /** Current journey state — gates the Publish Profile section. */
  readonly state = input.required<JourneyState>();

  /** Emits to open the Story-Slides flow. */
  readonly openStorySlides = output<void>();
  /** Emits to open the Publish flow. */
  readonly openPublish = output<void>();
  /** Emits when the modal should close. */
  readonly closed = output<void>();

  /** Downloadable asset kinds (only "story-slides" is active for now). */
  protected readonly assets = ASSET_KINDS;

  /** Every asset card opens the Share Studio (the canvas card exporter). */
  selectAsset(_id: string): void {
    this.openStorySlides.emit();
  }

  /** Closes when the backdrop itself is clicked. */
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
