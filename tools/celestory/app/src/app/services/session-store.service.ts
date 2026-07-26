import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IDENTITY_KEY, OWNER_SESSION_KEY } from '../models/session.constants';
import type { OwnerSession, StorageKind, ViewerIdentity } from '../models/session.types';

/**
 * Client-side owner session + viewer identity for the Celestory app.
 *
 * The owner session (handle + management token) lives in `sessionStorage`, so
 * owner mode survives a refresh within the same tab but resets when the tab is
 * closed or the profile URL is opened fresh — visitors (and the owner on a new
 * tab) always start on the public view until they log in. The editable viewer
 * identity (display name + username) lives in `localStorage`, shared app-wide.
 *
 * SSR-safe: touches web storage only in the browser. Nothing here is a security
 * boundary — the token is the server-signed capability and is verified server-side.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Handle the current tab is authenticated to manage, or null. */
  readonly ownerHandle = signal<string | null>(null);
  /** Management session token for the current tab, or null. */
  readonly token = signal<string | null>(null);
  /** Editable viewer identity (display name + username). */
  readonly identity = signal<ViewerIdentity>({ name: '', username: '' });

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    this.restore();
  }

  /** True when this tab is logged in as the owner of `handle`. */
  isOwnerOf(handle: string): boolean {
    return !!handle && this.ownerHandle() === handle && !!this.token();
  }

  /** Record an authenticated owner session for this tab. */
  setOwner(session: OwnerSession): void {
    this.ownerHandle.set(session.handle);
    this.token.set(session.token);
    this.persist(OWNER_SESSION_KEY, session, 'session');
  }

  /** Clear the owner session (logout / after a successful delete). */
  clearOwner(): void {
    this.ownerHandle.set(null);
    this.token.set(null);
    this.remove(OWNER_SESSION_KEY, 'session');
  }

  /** Update the editable viewer identity (persisted, shared app-wide). */
  setIdentity(identity: ViewerIdentity): void {
    this.identity.set(identity);
    this.persist(IDENTITY_KEY, identity, 'local');
  }

  private restore(): void {
    const owner = this.read<OwnerSession>(OWNER_SESSION_KEY, 'session');
    if (owner?.handle && owner?.token) {
      this.ownerHandle.set(owner.handle);
      this.token.set(owner.token);
    }
    // Accept the legacy `handle` key so identities saved before the rename survive.
    const identity = this.read<Partial<ViewerIdentity> & { handle?: string }>(IDENTITY_KEY, 'local');
    if (identity) {
      this.identity.set({
        name: identity.name ?? '',
        username: identity.username ?? identity.handle ?? '',
      });
    }
  }

  private area(kind: StorageKind): Storage {
    return kind === 'session' ? sessionStorage : localStorage;
  }

  private read<T>(key: string, kind: StorageKind): T | null {
    try {
      const raw = this.area(kind).getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private persist(key: string, value: unknown, kind: StorageKind): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      this.area(kind).setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable (private mode / quota) — non-fatal.
    }
  }

  private remove(key: string, kind: StorageKind): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      this.area(kind).removeItem(key);
    } catch {
      // Non-fatal.
    }
  }
}
