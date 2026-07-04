import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DEFAULT_SKY_LOCATION, SKY_LOC_KEY } from '../models/sky.constants';
import type { SkyLocation } from '../models/sky.types';

/**
 * Client-side observer location for the planetarium. Persists lat/lon/label to
 * localStorage so the sky frames the user's real horizon on return. SSR-safe:
 * reads/writes localStorage only in the browser.
 */
@Injectable({ providedIn: 'root' })
export class SkyLocationStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The current observer location. */
  readonly location = signal<SkyLocation>(DEFAULT_SKY_LOCATION);

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    this.restore();
  }

  /** Replace the observer location (and persist lat/lon/label). */
  setLocation(location: SkyLocation): void {
    this.location.set(location);
    this.persist(location);
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(SKY_LOC_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<SkyLocation>;
      if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number' && isFinite(parsed.lat) && isFinite(parsed.lon)) {
        this.location.set({ lat: parsed.lat, lon: parsed.lon, label: parsed.label ?? null, status: 'saved' });
      }
    } catch {
      // Storage unavailable / malformed — keep the default.
    }
  }

  private persist(location: SkyLocation): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(SKY_LOC_KEY, JSON.stringify({ lat: location.lat, lon: location.lon, label: location.label }));
    } catch {
      // Non-fatal.
    }
  }
}
