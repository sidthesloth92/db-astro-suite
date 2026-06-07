import {
  captionsIcon,
  cogIcon,
  concentricIcon,
  copyStackIcon,
  globeGridIcon,
  photoIcon,
  playCircleIcon,
} from '@db-astro-suite/ui';
import type { ToolDetailConfig } from '../../components/tool-detail/tool-detail.model';
import { ASTROGRAM_LAUNCH_URL, GITHUB_REPO_URL } from './tool.constants';

/**
 * Content configuration for the Astrogram detail page. Co-headlines the
 * tool's two shipped capabilities — exposure cards and the interactive,
 * plate-solved Stellar Map (multi-catalog identification + light-year
 * distances) — surfaced through the shared `ToolDetailComponent`.
 */
export const ASTROGRAM_DETAIL: ToolDetailConfig = {
  name: 'ASTROGRAM',
  titleAccent: 'ASTRO',
  titleRest: 'GRAM',
  tagline: 'Exposure Cards & Stellar Maps',
  missionLabel: 'Tool · Astrogram',
  moduleLabel: 'Module 02',
  status: 'ready',
  statusLabel: 'Ready',
  description:
    'Astrogram turns your astrophotography session into beautifully designed infographic exposure slides — complete with your image, equipment, and acquisition details. Automatically plate-solve your image to identify celestial objects, create rich annotations, explore their distances in light-years, and generate social-ready captions in seconds. Completely free, browser-based, and requiring no subscriptions or installation.',

  primaryLabel: 'Launch Astrogram',
  primaryUrl: ASTROGRAM_LAUNCH_URL,
  primaryExternal: false,
  secondaryLabel: 'View on GitHub',
  secondaryUrl: GITHUB_REPO_URL,

  previewKicker: 'Demo',

  stats: [
    { value: 'Plate Solving', label: '1 Click' },
    { value: 'Equipment', label: 'Showcase' },
    { value: '100+', label: 'Object distances' },
    { value: 'Free', label: 'Forever' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'Why Astrogram?',
  aboutMeta: 'The longer story',
  about: [
    'Every astrophotography image has a story behind it. The target you captured, the equipment you used, the hours of integration, and the countless celestial objects hidden within the frame are often just as interesting as the final image itself. Yet sharing all of that information is usually a manual, repetitive process involving image editors, note-taking, and lengthy social media posts.',
    'Astrogram was built to simplify that workflow.',
    'Upload your image and session details once, and Astrogram automatically generates a beautifully designed infographic exposure card showcasing your image, equipment, filters, exposure settings, acquisition statistics, and capture information in a format designed for sharing. It can even generate social-ready captions to help you publish your work faster.',
    'Want to explore what’s actually inside your image? Astrogram can plate-solve your frame and create an interactive Stellar Map, automatically identifying galaxies, nebulae, star clusters, stars, and other catalogued celestial objects within your field of view. Generate customizable annotations directly on your image, explore object information, and discover how far away these objects are with integrated light-year distance data.',
    'Everything updates live in your browser, allowing you to preview your infographic card, annotations, and stellar map before exporting. No design software, no complicated workflows, and no subscriptions to manage.',
  ],
  aboutPull:
    '“Just upload your image and transform a single astrophotography session into a complete visual story.”',

  features: [
    {
      icon: photoIcon,
      name: 'Professional infographic cards',
      body: 'Transform your astrophotography session into a beautifully designed exposure card.',
    },
    {
      icon: concentricIcon,
      name: 'Automatic plate solving',
      body: 'Instantly identify what’s in your image with a single upload.',
    },
    {
      icon: globeGridIcon,
      name: 'Interactive stellar map',
      body: 'Explore your image as a live, searchable map of the night sky.',
    },
    {
      icon: captionsIcon,
      name: 'Smart object annotations',
      body: 'Automatically label galaxies, nebulae, clusters, stars, and more.',
    },
    {
      icon: playCircleIcon,
      name: 'Light-year distances',
      body: 'Discover how far celestial objects are from Earth.',
    },
    {
      icon: cogIcon,
      name: 'Showcase your gear',
      body: 'Display your telescope, camera, filters, and acquisition details.',
    },
    {
      icon: copyStackIcon,
      name: 'Social-ready captions',
      body: 'Generate formatted captions and hashtags in seconds.',
    },
    {
      icon: concentricIcon,
      name: 'Customize everything',
      body: 'Adjust labels, colors, and annotations to match your style.',
    },
    {
      icon: globeGridIcon,
      name: 'Free & browser-based',
      body: 'No subscriptions, no installations, and no accounts required.',
    },
  ],

  steps: [
    {
      title: 'Upload image',
      body: 'Drop in your processed frame and session details.',
    },
    {
      title: 'Plate-solve',
      body: 'Astrogram identifies the objects in your field of view.',
    },
    {
      title: 'Annotate & map',
      body: 'Label objects on an interactive stellar map with light-year data.',
    },
    {
      title: 'Export & share',
      body: 'Save the infographic card and copy a social-ready caption.',
    },
  ],

  outputKicker: 'Exports',
  outputTitle: 'OUTPUT',
  outputMeta: 'END PRODUCT',
  outputCaption:
    'Two exports from one session — the plate-solved annotated image and the infographic exposure card — each downloadable as JPEG, PNG or WEBP.',

  ctaTitle: {
    before: 'Create a professional exposure card in ',
    accent: 'seconds',
    after: '.',
  },
  ctaSubtitle: 'No login · Free · Runs in your browser',
};
