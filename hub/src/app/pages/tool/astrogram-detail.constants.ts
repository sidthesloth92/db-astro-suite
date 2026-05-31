import {
  commentIcon,
  filterIcon,
  imageIcon,
  mapPinIcon,
  targetIcon,
  telescopeIcon,
} from '@db-astro-suite/ui';
import type { ToolDetailConfig } from '../../components/tool-detail/tool-detail.model';
import { ASTROGRAM_LAUNCH_URL, GITHUB_REPO_URL } from './tool.constants';

/**
 * Content configuration for the Astrogram detail page. Reflects the
 * tool's current, shipped capabilities — including plate-solved WCS
 * annotation overlays — surfaced through the shared `ToolDetailComponent`.
 */
export const ASTROGRAM_DETAIL: ToolDetailConfig = {
  name: 'ASTROGRAM',
  titleAccent: 'ASTRO',
  titleRest: 'GRAM',
  tagline: 'Professional exposure cards. Instantly.',
  missionLabel: 'Tool · Astrogram',
  moduleLabel: 'Tool 02',
  status: 'ready',
  statusLabel: 'Ready',
  description:
    'Astrogram turns your astrophotography session metadata into a pixel-perfect exposure card and a structured, hashtag-ready Instagram caption — instantly. No manual formatting, no repetitive typing; just enter your data and post.',

  primaryLabel: 'Launch Astrogram',
  primaryUrl: ASTROGRAM_LAUNCH_URL,
  primaryExternal: false,
  secondaryLabel: 'View on GitHub',
  secondaryUrl: GITHUB_REPO_URL,

  previewKicker: 'Demo · Preview',
  previewMeta: 'Sample output',

  stats: [
    { value: '~20s', label: 'Card → Post' },
    { value: '06', label: 'Inputs' },
    { value: '1-tap', label: 'Clipboard' },
    { value: 'JPEG', label: 'Export' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'What Astrogram is.',
  aboutMeta: 'The longer story',
  about: [
    'Every astrophotographer faces the same post-session dilemma. You’ve spent a clear night chasing photons, stacked your frames, and produced an image you’re proud of — but when it comes to sharing it, you’re back at square one. Hand-typing your equipment list, filter integrations, Bortle scale and sky conditions for every post is tedious, inconsistent, and kills the momentum of sharing your work.',
    'Astrogram was built to solve exactly that. Enter your session data once and it composes a clean, professionally typeset exposure card — the kind serious imagers recognise at a glance — alongside a structured, emoji-and-hashtag-ready caption formatted for Instagram.',
    'It goes further than a template. Astrogram can plate-solve your image and overlay accurate WCS annotations, labelling the stars, catalogue designations and deep-sky objects actually in your frame — turning a pretty picture into an annotated star chart.',
    'Everything renders live in the browser as you type, so you see exactly how the card will look before you export. There’s no account and no upload; your data never leaves your device.',
  ],
  aboutPull:
    '“The publishing arm of your telescope — twenty minutes of formatting becomes twenty seconds of typing.”',

  features: [
    {
      icon: imageIcon,
      name: 'Visual image generation',
      body: 'Instantly render a high-quality exposure card with perfectly balanced typography and a real-time preview.',
    },
    {
      icon: targetIcon,
      name: 'Plate-solved annotations',
      body: 'Solve your frame and overlay accurate WCS annotations — named stars, catalogue designations, and deep-sky objects.',
    },
    {
      icon: commentIcon,
      name: 'Caption + one-tap copy',
      body: 'Format your session data into a structured, hashtag-rich caption and copy it to the clipboard with a single tap.',
    },
    {
      icon: telescopeIcon,
      name: 'Full equipment stack',
      body: 'Dedicated fields for your telescope, mount, main camera, guide scope, and processing software.',
    },
    {
      icon: filterIcon,
      name: 'Exposure & filters',
      body: 'Highlight total integration time, sub-frame lengths, and LRGB / narrowband filter configurations.',
    },
    {
      icon: mapPinIcon,
      name: 'Bortle & location',
      body: 'Include your Bortle scale rating and capture location to add scientific context to your art.',
    },
  ],

  steps: [
    {
      title: 'Enter your target',
      body: 'Type the deep-sky object name to populate the card header and caption.',
    },
    {
      title: 'Input your gear stack',
      body: 'Add your telescope OTA, mount, imaging camera, guide scope, and software.',
    },
    {
      title: 'Set filter integrations',
      body: 'Configure LRGB / SHO channels with sub lengths and counts; totals are calculated for you.',
    },
    {
      title: 'Add session context',
      body: 'Include your Bortle rating, capture location, and observation date.',
    },
    {
      title: 'Customise & export',
      body: 'Pick an accent, preview live, export a JPEG, and copy the caption with one tap.',
    },
  ],

  outputKicker: 'The output',
  outputTitle: 'The exposure card.',
  outputMeta: '1080 × 1350 · JPEG',
  outputCaption: 'Exported as a 1080 × 1350 JPEG · caption copied to the clipboard',

  ctaTitle: {
    before: 'Build your next post in under ',
    accent: '30 seconds',
    after: '.',
  },
  ctaSubtitle: 'No login · Free · Runs in your browser',
};
