import type { ShareDestination, ShareOption } from './share.types';

/** Downloadable asset kinds in the Share modal's card grid. */
export const ASSET_KINDS: ShareOption[] = [
  {
    id: 'story-slides',
    label: 'Story Slides',
    description: 'A Wrapped-style set of vertical slides for Instagram / X Stories.',
    bullets: ['Multi-slide carousel for Instagram / X', 'One slide per chapter of your sky', 'Or a single card in four styles'],
  },
  {
    id: 'summary-card',
    label: 'Summary Card',
    description: 'A single square card with your headline numbers.',
    bullets: ['One gallery-ready snapshot', 'Name, hours & headline stats', 'Perfect for a Story or post'],
  },
  {
    id: 'poster',
    label: 'Poster',
    description: 'A high-resolution poster of your whole journey.',
    bullets: ['Wide, print-ready layout', 'Great as a banner or wallpaper', 'High-resolution PNG'],
  },
];

/** Story types in the Share Studio flow. */
export const STORY_TYPES: ShareOption[] = [
  { id: 'journey-summary', label: 'Journey Summary', description: 'Your identity, hours & headline stats.' },
  { id: 'year-in-review', label: 'Year In Review', description: 'One season, wrapped up.' },
  { id: 'target-collection', label: 'Top Targets', description: 'Your most-imaged objects.' },
  { id: 'timeline', label: 'Timeline', description: 'Every night, charted across the years.' },
  { id: 'sky-dome', label: 'Sky Dome', description: 'Your targets plotted on an all-sky dome.' },
  { id: 'moon-ribbon', label: 'Moon Phases', description: 'Your sessions across the lunar cycle.' },
  { id: 'filter-spectrum', label: 'Filter Spectrum', description: 'Hours split across the emission spectrum.' },
  { id: 'observatory-profile', label: 'Observatory Profile', description: 'Your rig & site at a glance.' },
  { id: 'gear-loadout', label: 'Gear Loadout', description: 'Every instrument in your kit.' },
];

/** Timeframe options in the Story-Slides flow. */
export const TIMEFRAMES: readonly string[] = [
  'All Time',
  'Current Year',
  'Previous Year',
  'Custom Range',
];

/** Visual themes in the Story-Slides flow. */
export const THEMES: readonly string[] = ['Observatory', 'Nebula', 'Starfield', 'Minimal'];

/** Export aspect ratios in the Story-Slides flow. */
export const ASPECT_RATIOS: readonly string[] = [
  'Square 1:1',
  'Portrait 4:5',
  'Story 9:16',
  'Landscape 16:9',
];

/** Suggested social destinations to share a freshly published journey. */
export const SUGGESTED_DESTINATIONS: ShareDestination[] = [
  { label: 'X', short: 'x', url: 'https://twitter.com/intent/tweet' },
  { label: 'Facebook', short: 'f', url: 'https://www.facebook.com/sharer/sharer.php' },
  { label: 'Reddit', short: 'r', url: 'https://www.reddit.com/r/astrophotography/' },
  { label: 'Cloudy Nights', short: 'w', url: 'https://www.cloudynights.com/' },
  { label: 'Threads', short: 't', url: 'https://www.threads.net/' },
  { label: 'Email', short: '@', url: 'mailto:' },
];
