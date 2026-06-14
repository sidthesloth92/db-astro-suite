import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type {
  ApiResponse,
  AttemptPing,
  CreateStoryResult,
  StoryDetails,
  UpdateStoryResult,
} from '../models/api.model';
import type { CommunityStats } from '../models/community-stats.model';
import type { CelestoryLedger } from '../models/ledger.model';

/** Stateless HTTP access to the Celestory story API. */
@Injectable({ providedIn: 'root' })
export class StoryService {
  private readonly http = inject(HttpClient);

  /** ② Create — publish a ledger under a handle (password-protected); returns URL + one-time delete key. */
  createStory(
    handle: string,
    password: string,
    ledger: CelestoryLedger,
  ): Observable<CreateStoryResult> {
    return this.http
      .post<ApiResponse<CreateStoryResult>>('/api/v1/stories', { handle, password, ledger })
      .pipe(map((response) => response.details));
  }

  /** ③ Update — re-publish an existing handle's ledger after verifying its password. */
  updateStory(
    handle: string,
    password: string,
    ledger: CelestoryLedger,
  ): Observable<UpdateStoryResult> {
    return this.http
      .put<ApiResponse<UpdateStoryResult>>(`/api/v1/stories/${encodeURIComponent(handle)}`, {
        password,
        ledger,
      })
      .pipe(map((response) => response.details));
  }

  /** Delete a published profile using its one-time delete token (the minted key). */
  deleteStory(handle: string, token: string): Observable<void> {
    return this.http
      .request<ApiResponse<{ handle: string }>>(
        'DELETE',
        `/api/v1/stories/${encodeURIComponent(handle)}`,
        { body: { key: token } },
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
}
