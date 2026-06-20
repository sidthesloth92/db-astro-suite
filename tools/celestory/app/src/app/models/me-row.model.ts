/** The authenticated viewer's personal row for a board (render-ready). */
import type { Scope } from './leaderboards.model';

/** Whether the personal row ranks the viewer or one of their items. */
export type MeKind = 'user' | 'item';

/** Render-ready personal row from the facade /me endpoint. */
export interface MeRow {
  kind: MeKind;
  rank: number;
  label: string;
  sub?: string;
  tag?: string;
  value: number;
  unit: string;
}

/** The /me endpoint payload — row is null when unauthenticated / no data. */
export interface BoardMeResponse {
  board: string;
  scope: Scope;
  row: MeRow | null;
}
