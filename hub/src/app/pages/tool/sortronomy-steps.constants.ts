import type { SegmentedTabOption } from '@db-astro-suite/ui';
import type { InstallOs } from '../../utils/detect-os.types';

/**
 * Content for the Sortronomy "How it works" step cards — the OS install
 * tabs, the copyable commands, and the static terminal mocks rendered in
 * each step's demo frame. The mocks are bound string constants (not inline
 * template text) so the Angular compiler's whitespace collapsing never
 * disturbs their alignment — the `<pre>` renders them verbatim.
 */

/** OS choices for the install-command tabs, in display order. */
export const SORTRONOMY_OS_TABS: readonly SegmentedTabOption[] = [
  { id: 'mac', label: 'macOS' },
  { id: 'windows', label: 'Windows' },
  { id: 'linux', label: 'Linux' },
];

/** One-line install command per OS (curl for macOS/Linux, PowerShell for Windows). */
export const SORTRONOMY_INSTALL_COMMANDS: Record<InstallOs, string> = {
  mac: 'curl -fsSL https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/sortronomy/scripts/install.sh | sh',
  windows:
    'irm https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/sortronomy/scripts/install.ps1 | iex',
  linux:
    'curl -fsSL https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/sortronomy/scripts/install.sh | sh',
};

/** The command that launches the interactive wizard — all the CLI a first run needs. */
export const SORTRONOMY_RUN_COMMAND = 'sortronomy';

/** How long the copy button shows its "copied" confirmation, in milliseconds. */
export const COPY_FEEDBACK_MS = 1400;

/** Step 01 visual — the install one-liner running to completion. */
export const SORTRONOMY_STEP_INSTALL_MOCK = `$ curl -fsSL …/install.sh | sh
  ↓ sortronomy v0.0.1 · darwin/arm64
  ✓ checksum verified
  ✓ installed to ~/.local/bin/sortronomy

$ sortronomy --version
sortronomy v0.0.1`;

/** Step 02 visual — the wizard's questions and its review screen. */
export const SORTRONOMY_STEP_REVIEW_MOCK = `$ sortronomy
? Input folder     ~/Captures
? Output folder    ~/Astro Library
? Group by focal length   Yes
? Group by date           Yes
? Group by filter         Yes

Review
▸ Execute
  Dry run — create folders only
  Go back and edit
  Cancel`;

/** Step 03 visual — a compact excerpt of the organised library tree. */
export const SORTRONOMY_STEP_TREE_MOCK = `~/Astro Library/
├─ ASI2600MM Pro/
│  └─ 530mm/
│     └─ M31/
│        └─ 2026-05-28/
│           ├─ Ha/    48 lights
│           ├─ OIII/  36 lights
│           └─ SII/   36 lights
└─ Calibration/
   ├─ Darks/   40
   ├─ Flats/   30
   └─ Bias/    50`;
