import {
  cameraIcon,
  cropIcon,
  gaugeIcon,
  rotateCcwIcon,
  sparklesIcon,
  starsIcon,
  uploadIcon,
  wandIcon,
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
  moduleLabel: 'Tool 01',
  status: 'ready',
  statusLabel: 'Ready',
  description:
    'A browser-based 4K starfield and galaxy animation generator. Set your parameters, hit record, and download a cinematic space background in minutes — no software to install, no account required.',

  primaryLabel: 'Launch Starwizz',
  primaryUrl: STARWIZZ_LAUNCH_URL,
  primaryExternal: false,
  secondaryLabel: 'View on GitHub',
  secondaryUrl: GITHUB_REPO_URL,

  previewKicker: 'Demo · Preview',
  previewMeta: 'Rendered in your browser',

  stats: [
    { value: '4K', label: 'Resolution' },
    { value: '~Mins', label: 'Time to clip' },
    { value: 'None', label: 'Install' },
    { value: '9', label: 'Formats' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'What Starwizz is.',
  aboutMeta: 'The longer story',
  about: [
    'Creating a cinematic space background used to require 3D software, stock-footage subscriptions, or a graphics team. For astrophotographers, content creators, and educators working alone, none of those options are quick or free. Starwizz collapses all of that into a single browser tab.',
    'It’s a real-time starfield and galaxy engine. Upload your own galaxy or nebula image as the backdrop, then shape the scene with intuitive controls — star density, travel speed and direction, rotation, zoom and shooting-star frequency. Want something more deliberate? Frame a custom A→B camera path and Starwizz glides a smooth, cinematic move between your two framings. The Canvas responds instantly, so the preview you’re watching is exactly what gets recorded.',
    'When the look is right, pick your platform format — Reels, Shorts, TikTok, square, portrait or full 16:9 4K — and Starwizz captures the animation directly in the browser via the MediaRecorder API, handing you a clean, perfectly looping MP4. Drop it behind a title sequence, a presentation, a music visualiser, or a social post.',
    'No installs, no render farm, no account. Just open the page, dial in a galaxy, and walk away with a cinematic background in minutes.',
  ],
  aboutPull:
    '“From a blank canvas to a 4K cosmic backdrop — without ever leaving the browser.”',

  features: [
    {
      icon: starsIcon,
      name: 'Population control',
      body: 'Modify the density and number of stars to simulate different galactic sectors.',
    },
    {
      icon: gaugeIcon,
      name: 'Camera travel & direction',
      body: 'Fly forward or back, or drift left, right, up and down with real parallax — and dial the travel speed.',
    },
    {
      icon: rotateCcwIcon,
      name: 'Rotational dynamics',
      body: 'Fine-tune camera rotation and zoom to create chaotic orbits or smooth, stable traversals.',
    },
    {
      icon: wandIcon,
      name: 'Custom camera path (A→B)',
      body: 'Set a start and end framing and Starwizz glides a smooth, cinematic move between them — with linked camera speed and duration.',
    },
    {
      icon: cropIcon,
      name: 'Multi-format export',
      body: 'One-click presets for Instagram Reels & Stories, square and portrait, TikTok, YouTube Shorts & 16:9, 4K, and Snapchat.',
    },
    {
      icon: uploadIcon,
      name: 'Upload your own backdrop',
      body: 'Drop in any galaxy or nebula image as the moving background, or roll with the built-in demo starfield.',
    },
    {
      icon: sparklesIcon,
      name: 'Shooting stars',
      body: 'Set the frequency of meteor streaks crossing the frame for cinematic punctuation.',
    },
    {
      icon: cameraIcon,
      name: '4K recording',
      body: 'Capture the animation at full 4K directly in the browser — no plugins required.',
    },
  ],

  steps: [
    {
      title: 'Set your backdrop',
      body: 'Upload your own galaxy or nebula image, or start from the built-in deep-space starfield.',
    },
    {
      title: 'Set your parameters',
      body: 'Dial star density, travel speed and direction, rotation, zoom and shooting-star frequency — or frame a custom A→B camera path.',
    },
    {
      title: 'Preview live',
      body: 'The Canvas renderer updates instantly — what you see is exactly what records.',
    },
    {
      title: 'Pick a format & record',
      body: 'Choose your platform format, hit record and Starwizz captures up to 4K in-browser via the MediaRecorder API.',
    },
    {
      title: 'Download and use',
      body: 'Drop the file straight into your editor, deck, or upload it to social media.',
    },
  ],

  outputKicker: 'See it in motion',
  outputTitle: 'The output',
  outputMeta: 'Looping 4K · MP4',
  outputCaption:
    'A perfectly looped 4K starfield — drop it behind a title, reel, or presentation.',

  ctaTitle: {
    before: 'Render a cinematic space background in ',
    accent: 'minutes',
    after: '.',
  },
  ctaSubtitle: 'No login · Free · Runs in your browser',
};
