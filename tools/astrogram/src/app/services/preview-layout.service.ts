import { Injectable, signal } from '@angular/core';

/**
 * Coordinates the displayed (post-scale) width of the card preview so
 * sibling components — most notably `CaptionSectionComponent` — can match
 * the card's actual on-screen width rather than the fixed 480 px design
 * baseline. Updated from `BaseCardPreviewComponent.calculateScale()` on
 * every reflow.
 */
@Injectable({ providedIn: 'root' })
export class PreviewLayoutService {
  /** Current post-scale displayed width of the card in CSS px. `null` until the first measurement. */
  readonly displayedCardWidth = signal<number | null>(null);
}
