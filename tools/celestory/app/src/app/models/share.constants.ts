import type { SplitButtonMenuItem } from '@db-astro-suite/ui';
import type { CelIconName } from '../components/cel-icon/cel-icon.component';
import type { ShareDestination, ShareOption } from './share.types';

/** Download-format options for the share card's split download button. */
export const DOWNLOAD_FORMAT_MENU: SplitButtonMenuItem[] = [
  { value: 'png', label: 'PNG', detail: 'lossless' },
  { value: 'jpeg', label: 'JPEG', detail: 'smaller file' },
];

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

/**
 * Story types in the Share Studio flow. Each `id` is the canvas renderer's
 * variant key, so the dropdown maps straight through to `renderShareCard`.
 */
export const STORY_TYPES: ShareOption[] = [
  { id: 'summary', label: 'Journey Summary', description: 'Your identity, hours & headline stats' },
  { id: 'year', label: 'Year In Review', description: 'One year, set in giant type' },
  { id: 'timeline', label: 'Timeline', description: 'First light to your latest night' },
  { id: 'targets', label: 'Top Targets', description: 'Your most-imaged objects' },
  { id: 'spectrum', label: 'Filter Spectrum', description: 'Your light as emission lines' },
  { id: 'skydome', label: 'Sky Dome', description: 'Your targets across the dome' },
  { id: 'moons', label: 'Moon Phases', description: 'Your nights vs the lunar cycle' },
  { id: 'equipment', label: 'Top Gear', description: 'The rig that did the work' },
];

/** Glyph shown next to each story type in the Share Studio picker (by id). */
export const STORY_TYPE_ICONS: Record<string, CelIconName> = {
  summary: 'star',
  year: 'chart',
  timeline: 'arrow',
  targets: 'galaxy',
  spectrum: 'chart',
  skydome: 'globe',
  moons: 'star',
  equipment: 'camera',
};

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
  { label: 'X', short: 'x', icon: 'x', url: 'https://twitter.com/intent/tweet' },
  { label: 'Facebook', short: 'f', icon: 'facebook', url: 'https://www.facebook.com/sharer/sharer.php' },
  { label: 'Reddit', short: 'r', icon: 'reddit', url: 'https://www.reddit.com/r/astrophotography/' },
  { label: 'Cloudy Nights', short: 'w', icon: 'cloudynights', url: 'https://www.cloudynights.com/' },
  { label: 'Threads', short: 't', icon: 'threads', url: 'https://www.threads.net/' },
  { label: 'Email', short: '@', icon: 'email', url: 'mailto:' },
];
