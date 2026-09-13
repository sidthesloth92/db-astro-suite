import {
  calendarIcon,
  copyStackIcon,
  cpuIcon,
  eyeIcon,
  tagIcon,
  telescopeIcon,
} from '@db-astro-suite/ui';
import type { ToolDetailConfig } from '../../components/tool-detail/tool-detail.model';
import { SORTRONOMY_REPO_URL } from './tool.constants';

/**
 * Content configuration for the Sortronomy detail page — the offline CLI
 * that organises astrophotography FITS files from their headers — surfaced
 * through the shared `ToolDetailComponent`. The "How it works" body is
 * projected by the page (`steps` stays empty; see `stepsMeta`).
 */
export const SORTRONOMY_DETAIL: ToolDetailConfig = {
  name: 'SORTRONOMY',
  titleAccent: 'SORT',
  titleRest: 'RONOMY',
  tagline: 'Drop in a folder, get a clean library',
  missionLabel: 'Tool · Sortronomy',
  moduleLabel: 'Tool 03',
  status: 'ready',
  statusLabel: 'Ready',
  description:
    'After a night of imaging, your capture software leaves you one giant folder of cryptically named files. Sortronomy is a small command-line wizard that reads what your camera recorded inside each photo and copies every frame into a clean, processing-ready library — by camera, target, date, and filter. Entirely offline, and it never touches your originals.',

  primaryLabel: 'Access Repository',
  primaryUrl: SORTRONOMY_REPO_URL,
  primaryExternal: true,

  previewKicker: 'Demo · Walkthrough',
  previewMeta: '00:29',

  stats: [
    { value: 'CLI', label: 'Cross-platform' },
    { value: '100%', label: 'Offline' },
    { value: 'FITS', label: 'Header-based' },
    { value: 'ZERO', label: 'Config needed' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'What Sortronomy is',
  aboutMeta: 'The longer story',
  about: [
    'Every capture app — ASIAIR, N.I.N.A., SharpCap, and the rest — dumps a night’s work into one folder of files with names like Light_0042.fit. Weeks later it’s hard to say which frames belong to which target, filter, or night. Sortronomy fixes that in one run: point it at the messy folder and it reads the details your gear recorded inside each file — camera, target, capture time, filter — and copies every frame into a tidy, processing-ready tree. Lights are grouped under their target; darks, flats, and bias frames get their own calibration area.',
    'It’s built to be safe to try: originals are copied, never moved or renamed in place, and a dry run builds the full folder structure before a single file is written. Everything happens on your machine — no account, no upload, no telemetry.',
  ],
  aboutPull: '“Completely offline — your data never leaves your computer.”',

  features: [
    {
      icon: telescopeIcon,
      name: 'Works with your capture software',
      body: 'ASIAIR, N.I.N.A., SharpCap, Ekos / KStars, SGP, Voyager, APT — all supported out of the box, with zero setup. If it writes standard files, Sortronomy sorts them.',
    },
    {
      icon: tagIcon,
      name: 'Sorts from the photo, not the filename',
      body: 'Sortronomy reads the details your gear recorded into every shot — and folds different spellings of the same camera into one name — so files land in the right place even when their names are a mess.',
    },
    {
      icon: copyStackIcon,
      name: 'Copies, never moves',
      body: 'Your originals stay exactly where they are. The organised library is built from copies, and re-running only fills in what’s missing.',
    },
    {
      icon: eyeIcon,
      name: 'Dry run first',
      body: 'Preview the entire folder tree before a single file is copied — inspect it in Finder or Explorer, then run for real.',
    },
    {
      icon: calendarIcon,
      name: 'Session-aware dates',
      body: 'Shots taken after dark roll into that night’s folder, so a single session never gets split across two dates — even past midnight.',
    },
    {
      icon: cpuIcon,
      name: 'Fully offline',
      body: 'No account, no uploads, no telemetry. Everything runs on your machine — nothing ever leaves your computer.',
    },
  ],

  steps: [],
  stepsMeta: '03 STEPS',

  outputKicker: 'The result',
  outputTitle: 'Before and after',
  outputMeta: 'Folder structure',
  outputCaption:
    'A raw capture dump on the left; the same frames sorted by camera, focal length, target, session date, and filter on the right — mono rigs get one folder per filter, one-shot-colour rigs a single tagged folder.',

  ctaTitle: {
    before: 'Bring order to your ',
    accent: 'FITS',
    after: ' captures',
  },
  ctaSubtitle: 'Open source · Offline · Cross-platform CLI',
};
