import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import type { ApiResponse } from '../models/api.model';
import type { BoardId } from '../models/leaderboard-board.model';
import type { Leaderboard, Scope } from '../models/leaderboards.model';
import type { BoardMeResponse, MeRow } from '../models/me-row.model';

/** Stateless HTTP access to the community leaderboards board facade. */
@Injectable({ providedIn: 'root' })
export class LeaderboardsService {
  private readonly http = inject(HttpClient);

  /** Fetch a board's render-ready entries for a time-window scope. */
  getBoard(boardId: BoardId, scope: Scope): Observable<Leaderboard> {
    return this.http
      .get<ApiResponse<Leaderboard>>(
        `/api/v1/leaderboards/boards/${boardId}?scope=${scope}`,
      )
      .pipe(map((response) => response.details));
  }

  /**
   * Fetch the authenticated viewer's personal row for a board, authorized by the
   * owner session token. Resolves to null when unauthenticated / no data.
   */
  getMyRow(boardId: BoardId, scope: Scope, token: string): Observable<MeRow | null> {
    return this.http
      .get<ApiResponse<BoardMeResponse>>(
        `/api/v1/leaderboards/boards/${boardId}/me?scope=${scope}`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
      )
      .pipe(
        map((response) => response.details.row),
        catchError(() => of(null)),
      );
  }
}
