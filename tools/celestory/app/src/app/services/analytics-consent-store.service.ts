import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { STORAGE_SERVICE_TOKEN } from '@db-astro-suite/ui';
import { ANALYTICS_CONSENT_KEY } from '../models/analytics-consent.constants';
import type { AnalyticsConsent } from '../models/analytics-consent.types';
import type { AnalyticsWindow } from '../models/analytics-window.model';

/**
 * The visitor's Google Analytics consent. GA never loads until they accept:
 * the choice is saved in the browser, index.html's inline script reads it on
 * later visits, and accepting mid-visit loads GA immediately. The prompt opens
 * on a first visit (no saved choice) and again from "Analytics settings".
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsConsentStore {
  private readonly storage = inject(STORAGE_SERVICE_TOKEN);
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The saved choice, or null when the visitor hasn't answered yet. */
  readonly choice = signal<AnalyticsConsent | null>(null);
  /** Whether the consent card is showing. */
  readonly promptOpen = signal(false);

  /** Read the saved choice (browser only) and open the prompt if there is none. */
  init(): void {
    if (!this.isBrowser) {
      return;
    }
    const saved = this.read();
    this.choice.set(saved);
    this.promptOpen.set(saved === null);
  }

  /** Accept: remember it and load Google Analytics now. */
  accept(): void {
    this.save('granted');
    this.promptOpen.set(false);
    this.analyticsWindow()?.celestoryLoadAnalytics?.();
  }

  /** Decline: remember it, and tell an already-loaded GA (accepted earlier this visit) to stop storing. */
  decline(): void {
    this.save('denied');
    this.promptOpen.set(false);
    this.analyticsWindow()?.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  }

  /** Reopen the prompt from "Analytics settings". */
  reopen(): void {
    this.promptOpen.set(true);
  }

  private analyticsWindow(): (Window & AnalyticsWindow) | null {
    // Cast: the inline script in index.html adds these optional hooks to window;
    // every use is optional-chained, so a missing hook is a safe no-op.
    return this.isBrowser ? (this.doc.defaultView as (Window & AnalyticsWindow) | null) : null;
  }

  private read(): AnalyticsConsent | null {
    try {
      const value = this.storage.getItem(ANALYTICS_CONSENT_KEY);
      return value === 'granted' || value === 'denied' ? value : null;
    } catch (error) {
      // Storage blocked (e.g. some private modes): ask again each visit.
      console.warn('Analytics consent could not be read; asking again.', error);
      return null;
    }
  }

  private save(value: AnalyticsConsent): void {
    this.choice.set(value);
    try {
      this.storage.setItem(ANALYTICS_CONSENT_KEY, value);
    } catch (error) {
      // Storage blocked: the choice holds for this visit only.
      console.warn('Analytics consent could not be saved; it applies to this visit only.', error);
    }
  }
}
