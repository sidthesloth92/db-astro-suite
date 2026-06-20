import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type {
  ApiResponse,
  AttemptPing,
  CreateStoryResult,
  LoginResult,
  StoryAuth,
  StoryDetails,
  UpdateStoryResult,
} from '../models/api.model';
import type { CommunityStats } from '../models/community-stats.model';
import type { CelestoryLedger } from '../models/ledger.model';

/** Stateless HTTP access to the Celestory story API. */
@Injectable({ providedIn: 'root' })
export class StoryService {
  private readonly http = inject(HttpClient);

  /** ② Create — publish a ledger under a handle (password-protected); returns URL + owner session token. */
  createStory(
    handle: string,
    password: string,
    ledger: CelestoryLedger,
  ): Observable<CreateStoryResult> {
    return this.http
      .post<ApiResponse<CreateStoryResult>>('/api/v1/stories', { handle, password, ledger })
      .pipe(map((response) => response.details));
  }

  /** ③ Update — re-publish an existing handle's ledger, authorized by token (owner) or password. */
  updateStory(
    handle: string,
    ledger: CelestoryLedger,
    auth: StoryAuth,
  ): Observable<UpdateStoryResult> {
    const body = auth.password ? { ledger, password: auth.password } : { ledger };
    return this.http
      .put<ApiResponse<UpdateStoryResult>>(
        `/api/v1/stories/${encodeURIComponent(handle)}`,
        body,
        this.authOptions(auth.token),
      )
      .pipe(map((response) => response.details));
  }

  /** Owner login — verify the profile password; returns a management session token. */
  login(handle: string, password: string): Observable<LoginResult> {
    return this.http
      .post<ApiResponse<LoginResult>>(
        `/api/v1/stories/${encodeURIComponent(handle)}/session`,
        { password },
      )
      .pipe(map((response) => response.details));
  }

  /**
   * Delete a published profile. Authorized by the owner's management session
   * token and/or the profile password (re-entered to confirm the destructive
   * action); the server accepts either.
   */
  deleteStory(handle: string, auth: { token?: string; password?: string }): Observable<void> {
    return this.http
      .request<ApiResponse<{ handle: string }>>(
        'DELETE',
        `/api/v1/stories/${encodeURIComponent(handle)}`,
        { ...this.authOptions(auth.token), body: { password: auth.password ?? '' } },
      )
      .pipe(map(() => undefined));
  }

  /** Fetches a published story by handle (used by the SSR portfolio page). */
  getStory(handle: string): Observable<StoryDetails> {
    return this.http
      .get<ApiResponse<StoryDetails>>(`/api/v1/stories/${encodeURIComponent(handle)}`)
      .pipe(map((response) => response.details));
  }

  /** Community aggregates for the landing counters — never any individual data. */
  getCommunityStats(): Observable<CommunityStats> {
    return this.http
      .get<ApiResponse<CommunityStats>>('/api/v1/stats')
      .pipe(map((response) => response.details));
  }

  /** Record a deduped anonymous attempt (visualise). Resolves to void. */
  recordAttempt(ping: AttemptPing): Observable<void> {
    return this.http
      .post<ApiResponse<Record<string, never>>>('/api/v1/pings', ping)
      .pipe(map(() => undefined));
  }

  /** Build request options carrying a Bearer token, or empty options if absent. */
  private authOptions(token: string | undefined): { headers?: HttpHeaders } {
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }
}
