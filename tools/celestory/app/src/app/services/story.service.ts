import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type {
  ApiResponse,
  CreateStoryResult,
  StoryDetails,
} from '../models/api.model';
import type { CommunityStats } from '../models/community-stats.model';
import type { CelestoryLedger } from '../models/ledger.model';

/** Stateless HTTP access to the Celestory story API. */
@Injectable({ providedIn: 'root' })
export class StoryService {
  private readonly http = inject(HttpClient);

  /** ② Create — publish a ledger under a handle; returns the URL + one-time key. */
  createStory(handle: string, ledger: CelestoryLedger): Observable<CreateStoryResult> {
    return this.http
      .post<ApiResponse<CreateStoryResult>>('/api/v1/stories', { handle, ledger })
      .pipe(map((response) => response.details));
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
}
