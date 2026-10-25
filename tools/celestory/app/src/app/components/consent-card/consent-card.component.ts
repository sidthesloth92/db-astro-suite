import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TextButtonComponent } from '@db-astro-suite/ui';
import { AnalyticsConsentStore } from '../../services/analytics-consent-store.service';

/**
 * Small, non-blocking analytics consent card in the bottom-left corner. Shown
 * on a first visit and from "Analytics settings"; Google Analytics loads only
 * after Accept. It never covers the page or traps focus.
 */
@Component({
  selector: 'dba-consent-card',
  standalone: true,
  imports: [RouterLink, TextButtonComponent],
  templateUrl: './consent-card.component.html',
  styleUrl: './consent-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsentCardComponent {
  /** Consent state + actions (shared with the footer's "Analytics settings"). */
  protected readonly consent = inject(AnalyticsConsentStore);
}
