import {
  apertureIcon,
  cpuIcon,
  downloadIcon,
  eyeIcon,
  globeGridIcon,
  photoIcon,
  slidersIcon,
  sparklesIcon,
  starsIcon,
  targetIcon,
} from '@db-astro-suite/ui';
import type { ToolDetailConfig } from '../../components/tool-detail/tool-detail.model';
import { ASTROSPIKE_LAUNCH_URL, GITHUB_REPO_URL } from './tool.constants';

/**
 * Content configuration for the AstroSpike detail page — the browser-based
 * diffraction-spike studio — surfaced through the shared `ToolDetailComponent`.
 */
export const ASTROSPIKE_DETAIL: ToolDetailConfig = {
  name: 'ASTROSPIKE',
  titleAccent: 'ASTRO',
  titleRest: 'SPIKE',
  tagline: 'Diffraction Spike Studio',
  missionLabel: 'Tool · AstroSpike',
  moduleLabel: 'Module 04',
  status: 'ready',
  statusLabel: 'Ready',
  description:
    'Give your astrophotos the diffraction spikes of a Newtonian or the six-armed signature of JWST — without a mask, a filter, or a photo editor. Drop in an image and AstroSpike finds the stars for you, then draws spikes that scale with each star’s real brightness and take their colour from the star itself. Everything runs inside your browser: your image is never uploaded anywhere.',

  primaryLabel: 'Launch AstroSpike',
  primaryUrl: ASTROSPIKE_LAUNCH_URL,
  primaryExternal: false,
  secondaryLabel: 'View on GitHub',
  secondaryUrl: GITHUB_REPO_URL,

  previewKicker: 'Demo',

  stats: [
    { value: '0', label: 'Uploads ever' },
    { value: '3', label: 'Spike presets' },
    { value: 'Full', label: 'Export resolution' },
    { value: 'Free', label: 'Forever' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'Why AstroSpike?',
  aboutMeta: 'The longer story',
  about: [
    'Diffraction spikes are what make a star look like a star. Refractor owners never get them, and adding them by hand in a photo editor means masking every star individually — hours of work that rarely survives a second look at full zoom.',
    'AstroSpike does the tedious part for you. It converts your image to luminance, models the background so nebulosity and gradients do not fool it, and finds the genuine point sources — rejecting hot pixels, satellite trails, and galaxy cores along the way. The star list is measured once and cached, so every slider you touch re-renders instantly.',
    'Spikes are composited additively over your original pixels, the way real diffraction behaves. Length and intensity follow each star’s measured brightness, and the colour is sampled from the star’s own core, so a warm orange giant gets warm spikes and a hot blue star gets cool ones. Pick Subtle, Classic, or JWST, nudge four sliders, click any star to include or exclude it, then export at your image’s native resolution.',
  ],
  aboutPull: '“Your image never leaves your browser.”',

  features: [
    {
      icon: cpuIcon,
      name: 'Automatic star detection',
      body: 'Finds real point sources in your image and ignores hot pixels, satellite trails, and nebula knots.',
    },
    {
      icon: globeGridIcon,
      name: 'Nothing is uploaded',
      body: 'Decoding, detection, rendering, and export all happen locally. There is no server and no account.',
    },
    {
      icon: sparklesIcon,
      name: 'Three spike presets',
      body: 'Subtle for a light touch, Classic for the four-armed Newtonian look, JWST for the six-armed signature.',
    },
    {
      icon: starsIcon,
      name: 'Brightness-aware spikes',
      body: 'Spike length and intensity scale with each star’s measured flux, so bright stars dominate naturally.',
    },
    {
      icon: apertureIcon,
      name: 'Colour taken from the star',
      body: 'Each spike is tinted with the colour sampled from that star’s core — warm stars glow warm.',
    },
    {
      icon: slidersIcon,
      name: 'Four controls, nothing more',
      body: 'How many stars, how long, how bright, and at what angle. Every other parameter is handled for you.',
    },
    {
      icon: targetIcon,
      name: 'Click any star',
      body: 'Toggle spikes on or off for individual stars. Your choices stick while you keep adjusting the sliders.',
    },
    {
      icon: eyeIcon,
      name: 'Before and after',
      body: 'Drag the comparison divider across the canvas to check your result against the untouched original.',
    },
    {
      icon: photoIcon,
      name: 'Built for big images',
      body: 'Works on 60-megapixel frames: the preview is downscaled for speed while the export stays native.',
    },
    {
      icon: downloadIcon,
      name: 'PNG or JPEG export',
      body: 'Save lossless PNG, or JPEG with an adjustable quality — always at your image’s original resolution.',
    },
  ],

  steps: [
    {
      title: 'Drop an image',
      body: 'Drag a PNG or JPEG onto the canvas, or pick one from your device.',
    },
    {
      title: 'Stars are found',
      body: 'Detection runs in the background and the Classic preset is applied straight away.',
    },
    {
      title: 'Choose a look',
      body: 'Subtle, Classic, or JWST — then switch between four and six spikes if you like.',
    },
    {
      title: 'Fine-tune',
      body: 'Adjust how many stars get spikes, their length, brightness, and rotation.',
    },
    {
      title: 'Export',
      body: 'Download a PNG or JPEG at the full resolution of the image you started with.',
    },
  ],

  outputKicker: 'The result',
  outputTitle: 'OUTPUT',
  outputMeta: 'END PRODUCT',
  outputCaption:
    'The same frame after detection and the Classic preset — spikes scaled by brightness and tinted per star.',

  ctaTitle: {
    before: 'Add diffraction spikes to your astrophotos in ',
    accent: 'seconds',
    after: '.',
  },
  ctaSubtitle: 'No login · Free · Runs entirely in your browser',
};
