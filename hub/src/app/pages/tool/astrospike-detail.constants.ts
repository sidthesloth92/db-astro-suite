import {
  apertureIcon,
  cpuIcon,
  eyeIcon,
  filterIcon,
  globeGridIcon,
  layersIcon,
  photoIcon,
  rainbowIcon,
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
    'Give your astrophotos the diffraction spikes of a Newtonian, the six-armed signature of JWST, or the soft bloom of a diffusion filter — without a mask, a filter, or a photo editor. Drop in an image and AstroSpike finds the stars for you, then draws spikes that scale with each star’s real brightness and take their colour from the star itself. Tune the whole field at once, or any single star on its own. Everything runs inside your browser: your image is never uploaded anywhere.',

  primaryLabel: 'Launch AstroSpike',
  primaryUrl: ASTROSPIKE_LAUNCH_URL,
  primaryExternal: false,
  secondaryLabel: 'View on GitHub',
  secondaryUrl: GITHUB_REPO_URL,

  previewKicker: 'Demo',

  stats: [
    { value: '0', label: 'Uploads ever' },
    { value: '4', label: 'Style presets' },
    { value: 'Full', label: 'Export resolution' },
    { value: 'Free', label: 'Forever' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'Why AstroSpike?',
  aboutMeta: 'The longer story',
  about: [
    'Diffraction spikes are what make a star look like a star. Refractor owners never get them, and adding them by hand in a photo editor means masking every star individually — hours of work that rarely survives a second look at full zoom.',
    'AstroSpike does the tedious part for you. It converts your image to luminance, models the background so nebulosity and gradients do not fool it, and finds the genuine point sources — rejecting hot pixels, satellite trails, and galaxy cores along the way. The star list is measured once and cached, so every slider you touch re-renders instantly.',
    'Spikes are composited additively over your original pixels, the way real diffraction behaves. Length and intensity follow each star’s measured brightness, and the colour is sampled from the star’s own core, so a warm orange giant gets warm spikes and a hot blue star gets cool ones. Each arm is graded along its length too — cool at the root, red at the tip — because diffraction spreads light by wavelength.',
    'Wide fields want the opposite treatment, so Diffusion blooms the stars the way a soft filter on the lens does, independently of the spikes — there is a whole Diffusion preset for that look on its own. Pick a preset, work the sliders, click any star to include or exclude it, double-click one to tune it alone, and place a star yourself if detection missed one. Export the finished frame, or the spikes on their own as a transparent layer to composite over your 16-bit master.',
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
      name: 'Four style presets',
      body: 'Subtle for a light touch, Classic for the four-armed Newtonian look, JWST for the six-armed signature, Diffusion for pure bloom.',
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
      icon: rainbowIcon,
      name: 'Chromatic spikes',
      body: 'Each arm is graded from a cool root to a red tip, the way real diffraction separates light by wavelength.',
    },
    {
      icon: filterIcon,
      name: 'Diffusion bloom',
      body: 'Bloom the stars like a soft filter on the lens — for wide fields where spikes would look wrong.',
    },
    {
      icon: slidersIcon,
      name: 'Tune one star alone',
      body: 'Double-click any star for its own length, brightness, rotation, and diffusion, layered on the globals.',
    },
    {
      icon: targetIcon,
      name: 'Click any star, or place one',
      body: 'Toggle spikes per star, drag a detection onto a core, and mark stars the detector missed entirely.',
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
      icon: layersIcon,
      name: 'PNG, JPEG, or a layer',
      body: 'Save a finished frame, or the spikes alone on transparency to composite over your own master.',
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
      body: 'Subtle, Classic, JWST, or a spike-free Diffusion bloom — then switch between four and six spikes if you like.',
    },
    {
      title: 'Fine-tune',
      body: 'Set how many stars get spikes, then their length, colour spread, bloom, brightness, and angle.',
    },
    {
      title: 'Work star by star',
      body: 'Double-click a star to tune it alone, or place one the detector missed.',
    },
    {
      title: 'Export',
      body: 'Download a PNG or JPEG at your original resolution, or the spikes alone as a transparent layer.',
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
