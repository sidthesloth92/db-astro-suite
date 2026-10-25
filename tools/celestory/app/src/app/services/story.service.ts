import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type {
  ApiResponse,
  AttemptPing,
  CreateStoryResult,
  LoginResult,
  RecoverResult,
  StoryAuth,
  StoryDetails,
  ChangePasswordResult,
  ProfileChanges,
  UpdateProfileResult,
  UpdateStoryResult,
} from '../models/api.model';
import type { CommunityStats } from '../models/community-stats.model';
import type { CelestoryStory } from '../models/story.model';

/** Stateless HTTP access to the Celestory story API. */
@Injectable({ providedIn: 'root' })
export class StoryService {
  private readonly http = inject(HttpClient);

  /** ② Create — publish a story under a handle (password-protected); returns URL + owner session token. */
  createStory(
    handle: string,
    password: string,
    story: CelestoryStory,
  ): Observable<CreateStoryResult> {
    return this.http
      .post<ApiResponse<CreateStoryResult>>('/api/v1/stories', { handle, password, story })
      .pipe(map((response) => response.details));
  }

  /** ③ Update — re-publish an existing handle's story, authorized by token (owner) or password. */
  updateStory(
    handle: string,
    story: CelestoryStory,
    auth: StoryAuth,
  ): Observable<UpdateStoryResult> {
    const body = auth.password ? { story, password: auth.password } : { story };
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

  /** Edit profile — change the display name and/or handle (owner session token required). */
  updateProfile(handle: string, changes: ProfileChanges, token: string): Observable<UpdateProfileResult> {
    return this.http
      .patch<ApiResponse<UpdateProfileResult>>(
        `/api/v1/stories/${encodeURIComponent(handle)}`,
        changes,
        this.authOptions(token),
      )
      .pipe(map((response) => response.details));
  }

  /** Change password — confirm the current one; returns a fresh owner session token. */
  changePassword(
    handle: string,
    currentPassword: string,
    newPassword: string,
    token: string,
  ): Observable<ChangePasswordResult> {
    return this.http
      .post<ApiResponse<ChangePasswordResult>>(
        `/api/v1/stories/${encodeURIComponent(handle)}/password`,
        { currentPassword, newPassword },
        this.authOptions(token),
      )
      .pipe(map((response) => response.details));
  }

  /** Forgot password — reset it with the profile's recovery code; returns an owner token + the new code. */
  recover(handle: string, code: string, newPassword: string): Observable<RecoverResult> {
    return this.http
      .post<ApiResponse<RecoverResult>>(
        `/api/v1/stories/${encodeURIComponent(handle)}/recover`,
        { code, newPassword },
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

  /** Record an anonymous attempt (visualise) — append-only, every attempt counts. Resolves to void. */
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
