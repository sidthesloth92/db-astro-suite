import { calendarIcon, cameraIcon, targetIcon } from '@db-astro-suite/ui';
import type { ToolDetailConfig } from '../../components/tool-detail/tool-detail.model';
import { FILE_GROUPER_REPO_URL } from './tool.constants';

/**
 * Content configuration for the File Grouper detail page — the Go CLI that
 * organises ASIAIR datasets — surfaced through the shared
 * `ToolDetailComponent`.
 */
export const FILE_GROUPER_DETAIL: ToolDetailConfig = {
  name: 'FILE GROUPER',
  titleAccent: 'FILE',
  titleRest: ' GROUPER',
  tagline: 'Dataset Organization Utility',
  missionLabel: 'Tool · File Grouper',
  moduleLabel: 'Tool 03',
  status: 'wip',
  statusLabel: 'In Progress',
  description:
    'A platform-agnostic Go utility that brings order to unstructured astrophotography datasets. Point it at your raw captures and it sorts thousands of frames into a logical, processing-ready hierarchy.',

  primaryLabel: 'Access Repository',
  primaryUrl: FILE_GROUPER_REPO_URL,
  primaryExternal: true,

  previewKicker: 'Demo · CLI',
  previewMeta: 'Terminal',

  stats: [
    { value: 'Go', label: 'Built in' },
    { value: 'CLI', label: 'Interface' },
    { value: 'ASIAIR', label: 'Optimized for' },
    { value: 'Cross', label: 'Platform' },
  ],

  aboutKicker: 'Overview',
  aboutTitle: 'What File Grouper is.',
  aboutMeta: 'The longer story',
  about: [
    'File Grouper is a platform-agnostic Go utility designed to solve the chaos of unstructured astrophotography datasets. Specifically optimised for ASIAIR and similar capture systems, it automates the tedious task of sorting thousands of frames into a logical hierarchy.',
    'A clean dataset is the foundation of high-quality processing. File Grouper ensures your data is ready for calibration and stacking before you even open your processing software.',
    'It reads the metadata your capture system already records — camera, date and target — and folders each frame accordingly, so multi-night projects and mixed sessions never bleed into one another.',
    'Run it once after a session, or wire it into your import routine; either way your raw directory stops being a dumping ground and starts being an archive.',
  ],
  aboutPull: '“A clean dataset is the foundation of high-quality processing.”',

  features: [
    {
      icon: cameraIcon,
      name: 'Sensor classification',
      body: 'Group and organise images by the camera model and sensor type detected in metadata.',
    },
    {
      icon: calendarIcon,
      name: 'Temporal sorting',
      body: 'Group entire imaging sessions by precise dates, keeping multi-night project data separate.',
    },
    {
      icon: targetIcon,
      name: 'Object targeting',
      body: 'Folder frames by celestial object name, separating your M42 from your Rosette instantly.',
    },
  ],

  steps: [
    {
      title: 'Install',
      body: 'go install github.com/sidthesloth92/db-astro-suite/tools/file-grouper@latest',
    },
    {
      title: 'Organize',
      body: 'Run file-grouper --organize-asiair ./raw-data against your capture directory.',
    },
    {
      title: 'Process',
      body: 'Your frames are sorted by camera, date, and object — ready for calibration.',
    },
  ],

  outputKicker: 'The result',
  outputTitle: 'A clean dataset.',
  outputMeta: 'Sorted hierarchy',
  outputCaption:
    'Frames grouped by camera, date, and object — ready for calibration and stacking.',

  ctaTitle: {
    before: 'Bring order to your ',
    accent: 'ASIAIR',
    after: ' captures.',
  },
  ctaSubtitle: 'Open source · Go · Cross-platform CLI',
};
