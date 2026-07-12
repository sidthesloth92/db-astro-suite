import type { InstallTool } from './landing.types';

/** Real install command per channel (see tools/celestory/README.md). */
export const INSTALL_COMMANDS: Record<InstallTool, string> = {
  brew: 'brew install --cask sidthesloth92/tap/celestory',
  powershell:
    'irm https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/celestory/install.ps1 | iex',
  winget: 'winget install sidthesloth92.Celestory',
  scoop:
    'scoop bucket add sidthesloth92 https://github.com/sidthesloth92/scoop-bucket && scoop install celestory',
};

/** Label shown on each install tab. */
export const INSTALL_LABELS: Record<InstallTool, string> = {
  brew: 'brew · macOS',
  powershell: 'powershell · Windows',
  winget: 'winget · Windows',
  scoop: 'scoop · Windows',
};

/** Install-channel tabs in display order. */
export const INSTALL_TOOLS: readonly InstallTool[] = [
  'brew',
  'powershell',
  'winget',
  'scoop',
];

/** GitHub Releases filtered to celestory — Linux and manual downloads. */
export const RELEASES_URL =
  'https://github.com/sidthesloth92/db-astro-suite/releases?q=celestory';

/** The scan command, shown beneath the install command (CLI uses `-input`/`-out`). */
export const SCAN_COMMAND = 'celestory -input ~/Astro -out celestory.json';

/** The DB Astro Suite hub the footer "All tools" link points back to. */
export const HUB_URL = 'https://dbastrosuite.com';

/** Public source repository, linked from the nav and footer GitHub icons. */
export const GITHUB_URL = 'https://github.com/sidthesloth92/db-astro-suite';

/** Astrogram tool page, linked from the footer "DB Astro Suite" column. */
export const ASTROGRAM_URL = `${HUB_URL}/tool/astrogram`;

/** Starwizz tool page, linked from the footer "DB Astro Suite" column. */
export const STARWIZZ_URL = `${HUB_URL}/tool/starwizz`;

/** Author's personal site, linked from the footer "Connect" column. */
export const ABOUT_URL = 'https://dineshbalajiv.com';

/** DB Astro Suite Instagram (@astrowithdb), linked from the footer "Connect" column. */
export const INSTAGRAM_URL = 'https://instagram.com/astrowithdb';
