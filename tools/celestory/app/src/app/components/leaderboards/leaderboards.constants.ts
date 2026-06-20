/**
 * Static view catalog for the community leaderboards — presentation identity
 * only (titles, blurbs, accents, icons, motifs). All data/business logic lives
 * in the API; this is just chrome. Board order matches the design.
 */
import type { BoardView, ScopeOption } from '../../models/leaderboard-board.model';

/** The nine boards, in display order. */
export const BOARD_VIEWS: readonly BoardView[] = [
  {
    id: 'hours',
    short: 'Hours',
    title: 'Integration Hours',
    blurb:
      'Total light gathered across every target — the truest measure of time under the sky.',
    accent: '#ff2a7b',
    accentRgb: '255,42,123',
    icon: 'clock',
    motif: 'clock',
  },
  {
    id: 'frames',
    short: 'Frames',
    title: 'Most Light Frames',
    blurb: 'Sheer photon-stacking volume — every sub counted, never uploaded.',
    accent: '#ff4d6d',
    accentRgb: '255,77,109',
    icon: 'frames',
    motif: 'stack',
  },
  {
    id: 'project',
    short: 'Projects',
    title: 'Longest Single-Target Projects',
    blurb: 'Obsession, measured — the most hours ever poured into one object.',
    accent: '#9b8cff',
    accentRgb: '155,140,255',
    icon: 'project',
    motif: 'timeline',
  },
  {
    id: 'object',
    short: 'Targets',
    title: 'Most-Imaged Targets',
    blurb: 'The deep-sky objects the community returns to night after night.',
    accent: '#19e6dd',
    accentRgb: '25,230,221',
    icon: 'target',
    motif: 'galaxy',
  },
  {
    id: 'cameras',
    short: 'Cameras',
    title: 'Most-Used Cameras',
    blurb:
      'The sensors capturing the most light across the community — mono, colour and modded DSLRs alike.',
    accent: '#4d8df0',
    accentRgb: '77,141,240',
    icon: 'camera',
    motif: 'sensor',
  },
  {
    id: 'mounts',
    short: 'Mounts',
    title: 'Most-Used Mounts',
    blurb:
      'What the community tracks the sky on — equatorial workhorses and the new strain-wave wave.',
    accent: '#f0a93a',
    accentRgb: '240,169,58',
    icon: 'mount',
    motif: 'equatorial',
  },
  {
    id: 'telescopes',
    short: 'Telescopes',
    title: 'Most-Used Telescopes',
    blurb:
      'The optics doing the heavy lifting — fast astrographs, apo refractors and long-focus SCTs.',
    accent: '#6fd3c0',
    accentRgb: '111,211,192',
    icon: 'telescope',
    motif: 'blueprint',
  },
  {
    id: 'month',
    short: 'Months',
    title: 'Best Imaging Months',
    blurb:
      'When the community logs the most hours — long nights and new-moon windows win.',
    accent: '#46cf7c',
    accentRgb: '70,207,124',
    icon: 'calendar',
    motif: 'calendar',
  },
  {
    id: 'filter',
    short: 'Filters',
    title: 'Most-Used Filters',
    blurb:
      'The wavelengths the community chases — narrowband still rules the dark.',
    accent: '#22d3c5',
    accentRgb: '34,211,197',
    icon: 'filter',
    motif: 'spectrum',
  },
];

/** Time-window scope options for the segmented control. */
export const SCOPE_OPTIONS: readonly ScopeOption[] = [
  { id: 'all', label: 'All-time' },
  { id: 'year', label: 'This year' },
  { id: 'month', label: 'This month' },
];
