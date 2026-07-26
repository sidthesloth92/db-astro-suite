import {
  cameraIcon,
  clockIcon,
  copyStackIcon,
  cpuIcon,
  shareIcon,
  telescopeIcon,
} from '@db-astro-suite/ui';
import type { ToolDetailConfig } from '../../components/tool-detail/tool-detail.model';
import { CELESTORY_APP_URL, GITHUB_REPO_URL } from './tool.constants';

/**
 * Content configuration for the Celestory detail page — the local-first CLI +
 * web app pair that turns a folder of FITS captures into a shareable
 * imaging-journey timeline — surfaced through the shared `ToolDetailComponent`.
 */
export const CELESTORY_DETAIL: ToolDetailConfig = {
  name: 'CELESTORY',
  titleAccent: 'CELE',
  titleRest: 'STORY',
  tagline: 'Your journey under the stars, charted',
  missionLabel: 'Tool · Celestory',
  moduleLabel: 'Tool 04',
  status: 'wip',
  statusLabel: 'Beta',
  description:
    'A command-line scanner and a web app, working as a pair. The CLI reads the FITS headers in your capture library — never the pixel data — and writes one celestory.json holding every target, filter, and piece of equipment you have ever imaged with. Drop that file on the web app to chart your whole imaging journey, and publish it only if you choose to.',

  primaryLabel: 'Launch Celestory',
  primaryUrl: CELESTORY_APP_URL,
  primaryExternal: true,
  secondaryLabel: 'View on GitHub',
  secondaryUrl: GITHUB_REPO_URL,

  previewKicker: 'Demo · Walkthrough',
  previewMeta: 'Coming soon',

  stats: [
    { value: '100%', label: 'Local scan' },
    { value: 'FITS', label: 'Header-based' },
    { value: '1 FILE', label: 'celestory.json' },
    { value: 'CLI+WEB', label: 'Two halves' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'What Celestory is',
  aboutMeta: 'The longer story',
  about: [
    'Every capture you have ever taken already carries its own history — the target, the filter, the camera, the night — written into its FITS headers. Celestory reads that history straight from your files: point the CLI at your library and it builds a per-target integration timeline and an equipment ledger, deduplicated across every folder and disk you have ever scanned, then writes it all into a single celestory.json. The scan is read-only and fully offline, and the file carries no local paths. From there the web app takes over: drop the file on it for a private, in-browser chart of your journey — and if you want the world to see it, claim a handle, publish a public profile, and take your place on the community leaderboards.',
  ],
  aboutPull:
    '“Your captures never leave your machine — only the story you choose to share does.”',

  features: [
    {
      icon: telescopeIcon,
      name: 'Reads your files, not your pixels',
      body: 'Recursively scans FITS headers from N.I.N.A., ASIAIR, SharpCap, Ekos, SGP, Voyager, APT and more — read-only, and never touches image data.',
    },
    {
      icon: clockIcon,
      name: 'Per-target integration timeline',
      body: 'Every object you have ever imaged, with integration hours accumulated night by night — from your very first light to your latest session.',
    },
    {
      icon: cameraIcon,
      name: 'Equipment & filter ledger',
      body: 'Cameras, telescopes, and filters tallied across your whole library, so you can see exactly what gear earned which photons.',
    },
    {
      icon: copyStackIcon,
      name: 'Duplicate-aware totals',
      body: 'Copies and backups are counted once and reported, and moved files heal automatically — your integration numbers stay honest.',
    },
    {
      icon: shareIcon,
      name: 'Publish & leaderboards',
      body: 'Preview privately in the browser, then optionally claim a handle, publish a public profile, and rank on the community leaderboards.',
    },
    {
      icon: cpuIcon,
      name: 'Single static binary',
      body: 'One small executable for macOS, Windows, and Linux. No runtime, no account, no telemetry — the scan runs entirely on your machine.',
    },
  ],

  steps: [
    {
      title: 'Install',
      body: 'One command on macOS, Windows, or Linux — tap to get the command for your system.',
      actionId: 'install',
    },
    {
      title: 'Scan',
      body: 'Run celestory. The wizard asks where your captures live, reads the headers, and writes celestory.json.',
    },
    {
      title: 'Chart & share',
      body: 'Drop the file on the web app for a private in-browser preview — then publish a profile and climb the leaderboards if you like.',
    },
  ],

  outputKicker: 'The result',
  outputTitle: 'One scan, one story',
  outputMeta: 'Terminal → celestory.json',
  outputCaption:
    'A scan on the left; the file it produces on the right — a per-target integration timeline plus an equipment ledger, with no local file paths inside.',

  ctaTitle: {
    before: 'Chart your ',
    accent: 'imaging journey',
    after: '.',
  },
  ctaSubtitle: 'Open source · Local-first · CLI + Web',
};
