import {
  captionsIcon,
  cogIcon,
  concentricIcon,
  globeGridIcon,
  photoIcon,
  playCircleIcon,
} from '@db-astro-suite/ui';
import type { ToolDetailConfig } from '../../components/tool-detail/tool-detail.model';
import { GITHUB_REPO_URL, STARWIZZ_LAUNCH_URL } from './tool.constants';

/**
 * Content configuration for the Starwizz detail page — the browser-based
 * 4K starfield & galaxy generator — surfaced through the shared
 * `ToolDetailComponent`.
 */
export const STARWIZZ_DETAIL: ToolDetailConfig = {
  name: 'STARWIZZ',
  titleAccent: 'STAR',
  titleRest: 'WIZZ',
  tagline: 'Cinematic Starfield Generator',
  missionLabel: 'Tool · Starwizz',
  moduleLabel: 'Module 01',
  status: 'ready',
  statusLabel: 'Ready',
  description:
    'Generate beautiful starfields, galaxies, and deep-space flythroughs without learning complex 3D software. Starwizz helps you create professional-looking space visuals in minutes — completely free, with no subscriptions and no installation required. It is the easiest way to turn a standalone photograph into scroll-stopping video content optimized for Instagram, TikTok, and YouTube.',

  primaryLabel: 'Launch Starwizz',
  primaryUrl: STARWIZZ_LAUNCH_URL,
  primaryExternal: false,
  secondaryLabel: 'View on GitHub',
  secondaryUrl: GITHUB_REPO_URL,

  previewKicker: 'Demo',

  stats: [
    { value: '4K', label: 'Export quality' },
    { value: '9', label: 'Platform formats' },
    { value: 'None', label: 'Installs required' },
    { value: 'Free', label: 'Forever' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'Why Starwizz?',
  aboutMeta: 'The longer story',
  about: [
    'Creating cinematic space videos used to require expensive 3D software, powerful hardware, and a steep learning curve. Starwizz changes that by putting a professional-grade space animation studio directly in your browser. No subscriptions, no installations, and no complicated setup.',
    'Upload your own galaxy or nebula image, then bring it to life with intuitive controls for star density, motion, zoom, rotation, and shooting stars. Want more cinematic movement? Create custom camera paths and preview every change in real time.',
    'When your scene is ready, export a high-quality MP4 optimized for your platform of choice — whether that’s Reels, Shorts, TikTok, square, portrait, or widescreen 16:9. Perfect for title sequences, presentations, music visualizers, livestreams, and social media content.',
  ],
  aboutPull: '“From idea to finished animation in minutes.”',

  features: [
    {
      icon: globeGridIcon,
      name: '100% free, in your browser',
      body: 'Zero subscriptions, no installations, and no hidden costs — just open a tab and start creating.',
    },
    {
      icon: photoIcon,
      name: 'Animate your own photos',
      body: 'Drop your favourite nebula or galaxy capture into the engine and watch it come alive instantly.',
    },
    {
      icon: playCircleIcon,
      name: 'Fly through space',
      body: 'Create the breathtaking illusion of deep-space travel with realistic, adjustable 3D movement.',
    },
    {
      icon: cogIcon,
      name: 'Be the director',
      body: 'Set a start and end point, and let Starwizz create a smooth, cinematic camera move between them.',
    },
    {
      icon: concentricIcon,
      name: 'Add dramatic depth',
      body: 'Add rotation and zoom effects to transform a static image into a living universe.',
    },
    {
      icon: globeGridIcon,
      name: 'Dial in the stars',
      body: 'Take total control over the density and depth of the background stars to perfectly match your aesthetic.',
    },
    {
      icon: playCircleIcon,
      name: 'Meteor showers on demand',
      body: 'Inject streaks of shooting stars to bring sudden energy and life to your deep-sky scenes.',
    },
    {
      icon: captionsIcon,
      name: 'Studio-quality 4K export',
      body: 'Render crisp, high-resolution videos directly in your browser with zero wait times.',
    },
    {
      icon: photoIcon,
      name: 'Ready for socials',
      body: 'Export perfectly formatted videos for Reels, TikTok, Shorts, Stories, and more.',
    },
  ],

  steps: [
    {
      title: 'Choose a scene',
      body: 'Pure deep-space starfield or a galaxy with nebula overlays.',
    },
    {
      title: 'Set parameters',
      body: 'Dial star density, velocity, rotation, zoom and shooting-star rate.',
    },
    {
      title: 'Preview live',
      body: 'The canvas updates instantly — what you see is what records.',
    },
    {
      title: 'Record at 4K',
      body: 'Hit record; Starwizz captures full 4K in-browser, no plugins.',
    },
    {
      title: 'Download',
      body: 'Drop the file into your editor, deck, or post it straight up.',
    },
  ],

  outputKicker: 'See it in motion',
  outputTitle: 'OUTPUT',
  outputMeta: 'END PRODUCT',
  outputCaption:
    'A perfectly looped 4K starfield — drop it behind a title, reel, or presentation.',

  ctaTitle: {
    before: 'Create stunning starfield videos for free in ',
    accent: 'minutes',
    after: '.',
  },
  ctaSubtitle: 'No login · Free · Runs in your browser',
};
