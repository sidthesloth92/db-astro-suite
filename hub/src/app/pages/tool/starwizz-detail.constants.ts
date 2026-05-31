import {
  cameraIcon,
  gaugeIcon,
  layersIcon,
  rotateCcwIcon,
  sparklesIcon,
  starsIcon,
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
    { value: 'MP4', label: 'Output' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'What Starwizz is.',
  aboutMeta: 'The longer story',
  about: [
    'Creating a cinematic space background used to require 3D software, stock-footage subscriptions, or a graphics team. For astrophotographers, content creators, and educators working alone, none of those options are quick or free. Starwizz collapses all of that into a single browser tab.',
    'It’s a real-time starfield and galaxy engine. You shape the scene with a handful of intuitive controls — star density, travel velocity, rotation, zoom, nebula overlays and shooting-star frequency — and the Canvas responds instantly, so the preview you’re watching is exactly what gets recorded.',
    'When the look is right, Starwizz captures the animation at full 4K directly in the browser via the MediaRecorder API and hands you a clean, perfectly looping MP4. Drop it behind a title sequence, a presentation, a music visualiser, or a social post.',
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
      name: 'Velocity vectors',
      body: 'Adjust travel speed to transition from a slow gentle drift to full high-warp effects.',
    },
    {
      icon: rotateCcwIcon,
      name: 'Rotational dynamics',
      body: 'Fine-tune camera rotation to create chaotic orbits or smooth, stable traversals.',
    },
    {
      icon: layersIcon,
      name: 'Nebula overlays',
      body: 'Layer dynamic nebula clouds over the field for a galaxy backdrop with real depth.',
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
      title: 'Choose a scene type',
      body: 'Pure deep-space starfield or a galaxy background with dynamic nebula overlays.',
    },
    {
      title: 'Set your parameters',
      body: 'Dial star density, velocity, rotation, zoom and shooting-star frequency in the live HUD.',
    },
    {
      title: 'Preview live',
      body: 'The Canvas renderer updates instantly — what you see is exactly what records.',
    },
    {
      title: 'Record at 4K',
      body: 'Hit record and Starwizz captures full 4K in-browser via the MediaRecorder API.',
    },
    {
      title: 'Download and use',
      body: 'Drop the file straight into your editor, deck, or upload it to social media.',
    },
  ],

  outputKicker: 'See it in motion',
  outputTitle: 'The output.',
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
