import type { InstallTool } from './landing.types';

/** Real install command per channel (see tools/celestory/README.md). */
export const INSTALL_COMMANDS: Record<InstallTool, string> = {
  brew: 'brew install sidthesloth92/tap/celestory',
  scoop:
    'scoop bucket add sidthesloth92 https://github.com/sidthesloth92/scoop-bucket && scoop install celestory',
};

/** Label shown on each install tab. */
export const INSTALL_LABELS: Record<InstallTool, string> = {
  brew: 'brew · macOS/Linux',
  scoop: 'scoop · Windows',
};

/** The scan command, shown beneath the install command (CLI uses `-input`/`-out`). */
export const SCAN_COMMAND = 'celestory -input ~/Astro -out ledger.json';

/** The DB Astro Suite hub the nav links back to. */
export const HUB_URL = 'https://dbastrosuite.com';
