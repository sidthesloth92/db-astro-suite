/** The authenticated viewer's personal row for a board. */
import type { LeaderboardEntry } from './leaderboards.model';
import type { RenderEntry } from './leaderboards-board.model';

/** Whether the personal row ranks the viewer themselves or one of their items. */
export type MeKind = 'user' | 'item';

/** A canonical personal-row result before presentation. */
export interface MeResult {
  kind: MeKind;
  entry: LeaderboardEntry;
}

/** Render-ready personal row returned by the facade /me endpoint. */
export interface MeRow extends RenderEntry {
  kind: MeKind;
}
