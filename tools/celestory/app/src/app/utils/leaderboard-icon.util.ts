/**
 * Leaderboard glyph set (ported verbatim from the design's icon map). Returns an
 * SVG string for a board/tab icon; pure presentation.
 */
import type { LeaderboardIconName } from '../models/leaderboard-board.model';

const ICONS: Readonly<Record<LeaderboardIconName, string>> = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  target:
    '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
  gear: '<circle cx="12" cy="12" r="8"/><path d="M12 4l3.4 6.2M20 12h-7M12 20l-3.4-6.2"/>',
  camera:
    '<rect x="3" y="7" width="18" height="13" rx="2.2"/><path d="M8.5 7l1.4-2.4h4.2L15.5 7"/><circle cx="12" cy="13.5" r="3.4"/>',
  mount:
    '<path d="M12 3v6"/><circle cx="12" cy="11.5" r="2.4"/><path d="M6 20l5-7.6M18 20l-5-7.6"/><path d="M4.5 13.5l4-2.6M19.5 13.5l-4-2.6"/>',
  telescope:
    '<path d="M4 14.5l9.5-5.2 2.2 4-9.5 5.2z"/><path d="M15.7 9.3l3.2-1.7 1.5 2.8-3.2 1.7"/><path d="M9 17.5L7.5 21M13 15.3L15 21"/>',
  calendar:
    '<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4.5M15 3v4.5"/>',
  frames:
    '<rect x="3.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M8 8.5V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.5"/>',
  filter: '<path d="M3 5.5h18l-7 8.2v5.3l-4-2v-3.3z"/>',
  project:
    '<path d="M3.5 18.5h17"/><path d="M6.5 18.5V11M12 18.5V8M17.5 18.5V5.5"/><circle cx="6.5" cy="11" r="1.5"/><circle cx="12" cy="8" r="1.5"/><circle cx="17.5" cy="5.5" r="1.5"/>',
};

/** Return the full `<svg>` markup for a leaderboard icon id. */
export function leaderboardIconSvg(name: LeaderboardIconName): string {
  const path = ICONS[name] ?? ICONS.target;
  return `<svg class="lic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
