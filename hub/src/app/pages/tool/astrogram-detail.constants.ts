import {
  apertureIcon,
  commentIcon,
  filterIcon,
  globeIcon,
  imageIcon,
  layersIcon,
  mapPinIcon,
  paletteIcon,
  targetIcon,
  telescopeIcon,
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
  tagline: 'Exposure cards + an interactive Stellar Map.',
  missionLabel: 'Tool · Astrogram',
  moduleLabel: 'Tool 02',
  status: 'ready',
  statusLabel: 'Ready',
  description:
    'Astrogram turns one astrophotography session into two things at once: a pixel-perfect exposure card with a hashtag-ready Instagram caption, and an interactive Stellar Map — your frame plate-solved, with every object named, catalogued and measured in light-years.',

  primaryLabel: 'Launch Astrogram',
  primaryUrl: ASTROGRAM_LAUNCH_URL,
  primaryExternal: false,
  secondaryLabel: 'View on GitHub',
  secondaryUrl: GITHUB_REPO_URL,

  previewKicker: 'Demo · Stellar Map',
  previewMeta: 'Plate-solved annotations',

  stats: [
    { value: '~20s', label: 'Card → Post' },
    { value: '10+', label: 'Catalogs' },
    { value: 'ly', label: 'Distances' },
    { value: '3', label: 'Export formats' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'What Astrogram is.',
  aboutMeta: 'The longer story',
  about: [
    'Every astrophotographer faces the same post-session dilemma. You’ve spent a clear night chasing photons, stacked your frames, and produced an image you’re proud of — but when it comes to sharing it, you’re back at square one. Hand-typing your equipment list, filter integrations, Bortle scale and sky conditions for every post is tedious, inconsistent, and kills the momentum of sharing your work.',
    'Astrogram was built to solve exactly that. Enter your session data once and it composes a clean, professionally typeset exposure card — the kind serious imagers recognise at a glance — alongside a structured, emoji-and-hashtag-ready caption formatted for Instagram.',
    'But Astrogram is more than a caption generator. Plate-solve your frame and it opens an interactive Stellar Map — your image pinned to the real sky, every star and deep-sky object labelled with its catalogue designations. Click any object to read its details.',
    'It identifies deeply: galaxies, nebulae, quasars, star clusters, named and HD stars, and Gaia DR3 field stars across Messier, NGC, IC, Caldwell, Sharpless, Barnard, Abell and more — and tags each one with its distance in light-years, drawn from SIMBAD measurements plus curated values for 100+ famous objects. Filter by type or catalogue and restyle any annotation — label, colour, size — to taste.',
    'The card and caption compose live in your browser as you type, so you see exactly how the card will look before you export; plate-solving sends only your image to the solver. No account, nothing to install.',
  ],
  aboutPull:
    '“From a finished frame to a captioned card and a fully-labelled star map — without ever leaving the browser.”',

  features: [
    {
      icon: targetIcon,
      name: 'Plate-solving',
      body: 'Solve your frame against the real sky to pin down exactly where it points — the foundation for every annotation.',
    },
    {
      icon: apertureIcon,
      name: 'Interactive Stellar Map',
      body: 'Explore your solved image as a live star chart — pan, zoom and click any object to read its designations and details.',
    },
    {
      icon: layersIcon,
      name: 'Deep multi-catalog ID',
      body: 'Galaxies, nebulae, quasars, clusters, named/HD stars and Gaia DR3 field stars across Messier, NGC, IC, Caldwell, Sharpless, Abell and more.',
    },
    {
      icon: globeIcon,
      name: 'Light-year distances',
      body: 'Every catalogued object tagged with its distance in light-years, from SIMBAD measurements plus curated values for 100+ famous targets.',
    },
    {
      icon: paletteIcon,
      name: 'Filter & style annotations',
      body: 'Toggle annotations by type or catalogue, switch to named-only, and override any label’s text, colour and size.',
    },
    {
      icon: imageIcon,
      name: 'Visual image generation',
      body: 'Instantly render a high-quality exposure card with perfectly balanced typography and a real-time preview.',
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
      title: 'Enter your target & gear',
      body: 'Type the deep-sky object, then add your telescope, mount, camera, guide scope and software.',
    },
    {
      title: 'Set filter integrations',
      body: 'Configure LRGB / SHO channels with sub lengths and counts; totals are calculated for you.',
    },
    {
      title: 'Plate-solve your image',
      body: 'Upload your frame and Astrogram solves it against the sky, identifying every object in view.',
    },
    {
      title: 'Explore the Stellar Map',
      body: 'Pan the labelled star chart, click objects for details, and read their distances and magnitudes.',
    },
    {
      title: 'Filter & customise',
      body: 'Toggle objects by type or catalogue and restyle any annotation’s label, colour or size.',
    },
    {
      title: 'Export & share',
      body: 'Export the exposure card and the annotated image, and copy your hashtag-ready caption with one tap.',
    },
  ],

  outputKicker: 'Exports',
  outputTitle: 'The output',
  outputMeta: 'JPEG · PNG · WEBP',
  outputCaption:
    'Two exports from one session — the plate-solved annotated image and the infographic exposure card — each downloadable as JPEG, PNG or WEBP.',

  ctaTitle: {
    before: 'Build your next post in under ',
    accent: '30 seconds',
    after: '.',
  },
  ctaSubtitle: 'No login · Free · Runs in your browser',
};
