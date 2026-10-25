import { Component, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConsentCardComponent } from './components/consent-card/consent-card.component';
import { AnalyticsConsentStore } from './services/analytics-consent-store.service';

/** Celestory root shell: hosts the file-based router outlet and the analytics consent card. */
@Component({
  selector: 'dba-celestory-root',
  imports: [RouterOutlet, ConsentCardComponent],
  templateUrl: './app.html',
})
export class App {
  private readonly consent = inject(AnalyticsConsentStore);
  /** Read the saved analytics choice once the app is running in the browser. */
  private readonly initConsent = afterNextRender(() => this.consent.init());
}
