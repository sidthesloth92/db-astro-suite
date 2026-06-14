import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IDENTITY_KEY, SESSION_KEY } from '../models/session.constants';
import type { PublishedSession, ViewerIdentity } from '../models/session.types';

/**
 * Client-side session + identity for the Celestory app. Holds the published
 * profile's handle + one-time delete token (shown in the published banner so the
 * owner can delete later) and the editable viewer identity (display name +
 * handle) shared between the portfolio hero editor and the Share Studio.
 *
 * SSR-safe: reads/writes `localStorage` only in the browser. Nothing here is a
 * security boundary — the delete token is the server-minted capability key.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Published handle for this device, or null. */
  readonly publishedHandle = signal<string | null>(null);
  /** One-time delete token (server-minted key), or null. */
  readonly deleteToken = signal<string | null>(null);
  /** Editable viewer identity (display name + handle). */
  readonly identity = signal<ViewerIdentity>({ name: '', handle: '' });

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    this.restore();
  }

  /** Record a freshly published profile (handle + delete token). */
  setPublished(session: PublishedSession): void {
    this.publishedHandle.set(session.handle);
    this.deleteToken.set(session.deleteToken);
    this.persist(SESSION_KEY, session);
  }

  /** Clear the published session (after a successful delete). */
  clearPublished(): void {
    this.publishedHandle.set(null);
    this.deleteToken.set(null);
    this.remove(SESSION_KEY);
  }

  /** Update the editable viewer identity (persisted, shared app-wide). */
  setIdentity(identity: ViewerIdentity): void {
    this.identity.set(identity);
    this.persist(IDENTITY_KEY, identity);
  }

  private restore(): void {
    const session = this.read<PublishedSession>(SESSION_KEY);
    if (session?.handle) {
      this.publishedHandle.set(session.handle);
      this.deleteToken.set(session.deleteToken ?? null);
    }
    const identity = this.read<ViewerIdentity>(IDENTITY_KEY);
    if (identity) {
      this.identity.set({ name: identity.name ?? '', handle: identity.handle ?? '' });
    }
  }

  private read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private persist(key: string, value: unknown): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable (private mode / quota) — non-fatal.
    }
  }

  private remove(key: string): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // Non-fatal.
    }
  }
}
