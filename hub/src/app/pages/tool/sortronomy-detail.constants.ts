import {
  calendarIcon,
  cameraIcon,
  cpuIcon,
  filterIcon,
  tagIcon,
  telescopeIcon,
} from '@db-astro-suite/ui';
import type { ToolDetailConfig } from '../../components/tool-detail/tool-detail.model';
import { SORTRONOMY_REPO_URL } from './tool.constants';

/**
 * Content configuration for the Sortronomy detail page — the offline CLI
 * that organises astrophotography FITS files from their headers — surfaced
 * through the shared `ToolDetailComponent`.
 */
export const SORTRONOMY_DETAIL: ToolDetailConfig = {
  name: 'SORTRONOMY',
  titleAccent: 'SORT',
  titleRest: 'RONOMY',
  tagline: 'Drop in a folder, get a clean library',
  missionLabel: 'Tool · Sortronomy',
  moduleLabel: 'Tool 03',
  status: 'wip',
  statusLabel: 'In Progress',
  description:
    'A command-line wizard that sorts your astrophotography captures into a clean, ready-to-process library — by camera, target, date, and filter. Works with every major capture app, and runs entirely offline: nothing ever leaves your machine.',

  primaryLabel: 'Access Repository',
  primaryUrl: SORTRONOMY_REPO_URL,
  primaryExternal: true,

  previewKicker: 'Demo · Walkthrough',
  previewMeta: 'Coming soon',

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
    'Sortronomy is a command-line wizard that brings order to the mess capture software leaves behind. Point it at a night’s folder of raw shots and it sorts every frame into a clean, ready-to-process library — grouped by camera, target, date, and filter. No renaming, no dragging files around: run it once after a session and your raw folder becomes a tidy archive instead of a dumping ground. And it’s completely offline — no account, no upload, no telemetry — so your data never leaves your computer.',
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
      body: 'Sortronomy reads the details your gear recorded into every shot, so files land in the right place even when their names are a mess.',
    },
    {
      icon: calendarIcon,
      name: 'Session-aware dates',
      body: 'Shots taken after dark roll into that night’s folder, so a single session never gets split across two dates — even past midnight.',
    },
    {
      icon: cameraIcon,
      name: 'Camera normalization',
      body: 'Different spellings of the same camera fold into one name, so one rig never ends up scattered across your library.',
    },
    {
      icon: filterIcon,
      name: 'OSC filter tagging',
      body: 'Tag a filter once and Sortronomy labels every matching shot for you — handy for one-shot-colour rigs.',
    },
    {
      icon: cpuIcon,
      name: 'Fully offline',
      body: 'No account, no uploads, no telemetry. Everything runs on your machine — nothing ever leaves your computer.',
    },
  ],

  steps: [
    {
      title: 'Install',
      body: 'One command on macOS, Windows, or Linux — tap to get the command for your system.',
      actionId: 'install',
    },
    {
      title: 'Run',
      body: 'Run sortronomy. It asks for your source and output folders, then confirms before it touches anything.',
    },
    {
      title: 'Execute',
      body: 'Confirm, and Sortronomy sorts every shot into a clean, calibration-ready tree — by camera, target, date, and filter.',
    },
  ],

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
