import {
  captionsIcon,
  cogIcon,
  globeGridIcon,
  layersIcon,
  paletteIcon,
  photoIcon,
  playCircleIcon,
  sparklesIcon,
  targetIcon,
} from '@db-astro-suite/ui';
import type { ToolDetailConfig } from '../../components/tool-detail/tool-detail.model';
import { GITHUB_REPO_URL, STARWIZZ_LAUNCH_URL } from './tool.constants';

/**
 * Content configuration for the Starwizz detail page (the browser-based
 * starfield and galaxy video generator, with its 2D and 3D modes), surfaced
 * through the shared `ToolDetailComponent`.
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
    'Generate beautiful starfields, galaxies and deep-space flythroughs without learning complex 3D software. Upload one astrophoto and Starwizz turns it into a professional-looking space video in minutes. The new 3D mode lifts the real stars off your photo and flies you through them. Completely free, with no subscriptions and no installation required, and sized for Instagram, TikTok and YouTube.',

  primaryLabel: 'Launch Starwizz',
  primaryUrl: STARWIZZ_LAUNCH_URL,
  primaryExternal: false,
  secondaryLabel: 'View on GitHub',
  secondaryUrl: GITHUB_REPO_URL,

  previewKicker: 'Demo',

  stats: [
    { value: '4K', label: 'Export quality' },
    { value: '2D + 3D', label: 'Animation modes' },
    { value: '9', label: 'Platform formats' },
    { value: 'Free', label: 'Forever' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'Why Starwizz?',
  aboutMeta: 'The longer story',
  about: [
    'Creating cinematic space videos used to require expensive 3D software, powerful hardware, and a steep learning curve. Starwizz changes that by putting a professional-grade space animation studio directly in your browser. No subscriptions, no installations, and no complicated setup.',
    'Upload your own galaxy or nebula image, then bring it to life with intuitive controls for star density, natural star colors, twinkle, diffraction spikes, motion, zoom, rotation, and shooting stars. Want more cinematic movement? Create custom camera paths and preview every change in real time.',
    'Switch to 3D and Starwizz goes a step further. It finds the stars in your photo, lifts them off the image and sets them at different depths in front of your nebula. Travel glides the camera through that star field in any direction. Arrive starts deep inside a cloud of stars and settles on your target, with every star returning to where you photographed it.',
    'When your scene is ready, export a high-quality MP4 sized for your platform of choice, whether that is Reels, Shorts, TikTok, square, portrait, or widescreen 16:9. Perfect for title sequences, presentations, music visualizers, livestreams, and social media content.',
  ],
  aboutPull: '“From idea to finished animation in minutes.”',

  features: [
    {
      icon: globeGridIcon,
      name: '100% free, in your browser',
      body: 'Zero subscriptions, no installations, and no hidden costs. Just open a tab and start creating.',
    },
    {
      icon: photoIcon,
      name: 'Animate your own photos',
      body: 'Drop your favourite nebula or galaxy capture into the engine and watch it come alive instantly.',
    },
    {
      icon: layersIcon,
      name: 'Real 3D from one photo',
      body: 'Switch to 3D and Starwizz lifts the stars off your image and spreads them through real depth, so near stars sweep past while your nebula holds behind them.',
    },
    {
      icon: targetIcon,
      name: 'Travel or Arrive',
      body: 'Glide through the star field in any direction, or start deep in a cloud of stars and arrive at your target as it comes into view.',
    },
    {
      icon: playCircleIcon,
      name: 'Fly, zoom and rotate',
      body: 'Move forward, backward or sideways through space, then add zoom and a slow turn in either direction.',
    },
    {
      icon: cogIcon,
      name: 'Be the director',
      body: 'Set a start and end point, and let Starwizz create a smooth, cinematic camera move between them.',
    },
    {
      icon: globeGridIcon,
      name: 'Dial in the stars',
      body: 'Take total control over the amount, size and depth of the stars to perfectly match your aesthetic.',
    },
    {
      icon: paletteIcon,
      name: 'Natural star colors',
      body: 'Stars glow in lifelike blue, yellow and orange hues, with sliders for how vivid the tints are and how many stars carry them.',
    },
    {
      icon: sparklesIcon,
      name: 'Twinkle & diffraction spikes',
      body: 'Give the brightest stars four-point diffraction spikes and dial the twinkle from a subtle shimmer to a dramatic pulse.',
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
      title: 'Add your photo',
      body: 'Start with the built-in nebula or upload your own galaxy or nebula image.',
    },
    {
      title: 'Pick 2D or 3D',
      body: '2D animates stars over your image. 3D lifts the real stars off it and flies through them.',
    },
    {
      title: 'Set the look',
      body: 'Dial in direction, speed, rotation, star amount, colors, twinkle and spikes.',
    },
    {
      title: 'Preview live',
      body: 'The canvas updates instantly. What you see is what records.',
    },
    {
      title: 'Record and download',
      body: 'Hit record. Starwizz captures the video in your browser and saves an MP4 ready to post.',
    },
  ],

  outputKicker: 'See it in motion',
  outputTitle: 'OUTPUT',
  outputMeta: 'END PRODUCT',
  outputCaption:
    'A 9:16 flythrough of the Horsehead Nebula with natural star colors and diffraction spikes. Drop it behind a title, reel, or presentation.',

  ctaTitle: {
    before: 'Create stunning starfield videos for free in ',
    accent: 'minutes',
    after: '.',
  },
  ctaSubtitle: 'No login · Free · Runs in your browser',
};
