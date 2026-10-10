# Celestory

**Your astrophotography imaging history, read straight from your files.**

> **Public beta** — fully usable today, iterating quickly. Found a rough edge?
> [Open an issue](https://github.com/sidthesloth92/db-astro-suite/issues/new).

Point Celestory at a folder of captures and it recursively reads the **FITS
headers** (never the pixel data), figures out every **object** you've imaged, the
**equipment** and **filters** you used, and the **integration hours per object over
time** — then writes a single `celestory.json`. Upload it to the
[Celestory web app](https://celestory.dbastrosuite.com) to chart your journey.

Everything runs **locally**. Your files never leave your machine, and Celestory
is **read-only** — it never moves, renames, or deletes anything.

---

## Install

One line — nothing else to install. The script downloads the right binary for
your OS, verifies its checksum, and puts it on your `PATH`.

### macOS & Linux

```bash
curl -fsSL https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/celestory/scripts/install.sh | sh
```

No `curl`? Use `wget`:

```bash
wget -qO- https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/celestory/scripts/install.sh | sh
```

Installs to `~/.local/bin`. The script is small and [public](scripts/install.sh) —
read it first if you'd rather not pipe it straight to a shell.

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/celestory/scripts/install.ps1 | iex
```

Installs `celestory.exe` to `%LOCALAPPDATA%\Programs\Celestory` and adds it to your PATH.

### Upgrade

Re-run the same install command — it replaces the binary in place with the latest release.

### Manual download

Prefer to grab it yourself? Download the archive for your platform from the
[Releases page](https://github.com/sidthesloth92/db-astro-suite/releases?q=celestory),
extract it, and move the `celestory` binary onto your `PATH`.

> **Coming soon:** one-line installs via **Homebrew**, **Scoop**, and **winget**
> in a following release.

## Quick start

**Easiest — just run it and follow the prompts:**

```sh
celestory
```

The wizard asks which folder your images are in and where to save `celestory.json`,
then scans and writes it. Drop that file onto the Celestory web app to visualise.

**Scriptable:**

```sh
celestory -input /path/to/captures -out /path/to/output
```

## See your stats

Open the [Celestory web app](https://celestory.dbastrosuite.com) and drop your
`celestory.json` onto the page. It renders **100% in your browser** — nothing is
uploaded, and your data never leaves your machine. From there you can explore your
whole imaging journey and export gallery-grade cards to share.

## Publish & leaderboards

Dropping `celestory.json` on the web app gives you a **private, in-browser
preview** — nothing is uploaded. From there, publishing is **opt-in**:

- **Claim a handle** to publish your story to a public profile at
  `celestory.dbastrosuite.com/user/<your-handle>`, protected by a password you
  set (owner sessions are per-tab — close the tab and you're signed out).
- Published stories feed the community
  [leaderboards](https://celestory.dbastrosuite.com/leaderboards) — rankings by
  integration time, targets, filters, and equipment.
- `celestory -profile <name>` saves your handle locally so publishing is
  pre-filled, and gives your stories a stable owner anchor when you generate
  from more than one machine.

Remember: `celestory.json` carries no local file paths, and nothing leaves your
machine unless you choose to publish.

## Where your files are saved

By default `celestory.json` lands in the folder you ran the command from (the wizard
lets you choose). Celestory prints the full path when it finishes, and `-out`
overrides where it goes:

- `-out /some/dir` → writes `celestory.json` into that directory.
- `-out /some/dir/celestory.json` → names the file directly.

Each run **replaces** any existing `celestory.json` with a freshly created file
containing your complete, up-to-date story (it's regenerated from your whole
library every time, so nothing is lost) — the file's creation date always tells
you when it was last generated.

## Flags

The interface is intentionally small — most runs need none of these. They're
grouped below by what they touch.

**Scanning**

| Flag                | Description                                                    |
| ------------------- | ------------------------------------------------------------- |
| `-input <dir>`      | Folder of FITS captures to scan (omit to launch the wizard).  |
| `-out <dir\|.json>` | Output directory or `.json` file. Default: current directory. |

**Cache** (re-scan speed — see [How the cache works](#how-the-cache-works))

| Flag        | Description                          |
| ----------- | ------------------------------------ |
| `-no-cache` | Don't read or write the scan cache.  |

**Duplicates** (see [Duplicates](#duplicates))

| Flag              | Description                                                              |
| ----------------- | ----------------------------------------------------------------------- |
| `-all-duplicates` | Report duplicates across your whole library, not just the scanned folder. |

**Library history** — Celestory keeps a cumulative index of every folder you've
scanned, so your totals stay correct even when a disk is disconnected. These flags
maintain it. None of them ever touch your FITS files, and the destructive ones ask
for confirmation first (`-yes` skips the prompt for scripts).

| Flag            | Description                                                                       |
| --------------- | -------------------------------------------------------------------------------- |
| `-fresh`        | Wipe the cumulative library index, then rebuild it from this scan.               |
| `-reset`        | Wipe **both** the scan cache and the cumulative library index, then exit — a full clean slate. |
| `-forget <dir>` | Drop a folder you no longer own from the cumulative library index.               |
| `-keep-deleted` | Keep frames whose files were deleted from the scanned folder (don't un-count culled subs). |
| `-yes`          | Skip the confirmation prompt for `-reset` / `-fresh` / `-forget`.                |

**Identity & info**

| Flag              | Description                                                                         |
| ----------------- | ---------------------------------------------------------------------------------- |
| `-profile <name>` | Save your Celestory username (pre-fills publishing; a stable owner anchor across machines). Pass `-profile ""` to clear it. |
| `-config`         | Print the output, cache, and config locations, then exit.                          |
| `-v`, `-version`  | Print the version and exit.                                                         |

**Diagnostics**

| Flag      | Description                                                                                                                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-report` | Also save the entire debug log as `celestory-report.log` in the current folder when this run finishes — success, error, or cancelled. See [Troubleshooting & sharing logs](#troubleshooting--sharing-logs). |

It always parses headers using all your CPU cores.

## Exit codes

Handy when scripting:

| Code  | Meaning                                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`   | Success — including when no FITS files were found, and info-only runs (`-config`, `-version`, saving a profile).                                                                                            |
| `1`   | Run failure. The entire debug log is saved as `celestory-error.log` in the folder you ran from (or as `celestory-report.log` if `-report` was passed).                                                      |
| `2`   | Invalid usage — an unknown flag, a missing/invalid `-input`, or a destructive op (`-reset` / `-fresh` / `-forget`) refused without `-yes` on a non-interactive run. No report is written; the input just needs fixing. |
| `130` | Cancelled — Ctrl-C, Esc inside a wizard prompt, or a declined confirmation. No report is written (unless `-report` was passed).                                                                             |

## How the cache works

Re-scanning a large library is wasteful, so Celestory remembers what it parsed. On
each run it `stat`s every file (one cheap syscall, no bytes read) and compares the
**size + modification time** against the cache — unchanged files are reused, only
new/changed files are parsed. Re-runs drop from minutes to seconds.

The cache is fully automatic — it lives in your OS cache directory, needs no setup,
and never affects your numbers (it only speeds up re-scans). `-no-cache` runs without
it; `-reset` clears it (together with the library index) for a clean slate. `-config`
prints its location (alongside your output and history-index paths).

## Duplicates

If the same sub is sitting in two places (e.g. a working copy and a backup), it's
**counted once** toward your integration and **reported** so you know — Celestory
never deletes anything.

**Moving files doesn't create phantom duplicates.** When a scan finds a sub that an
earlier scan indexed elsewhere, Celestory checks the old location: if the old copy is
confirmed gone (you moved or deleted it), the index quietly updates to the new
location; if it's still there, it's a real duplicate and gets reported. A copy on a
disconnected disk can't be checked, so it's not reported — the scanned folder is
simply treated as the latest location until that disk is scanned again. Your FITS
files are never touched — only Celestory's own index. The per-file duplicate list is shown **on the terminal
only**: it contains local file paths, which are never written to `celestory.json`
(the file you upload). The path-free counts still appear in the summary.

By default the report is **scoped to the folder you scanned** — a set with a copy in
that folder (even if its twin lives on another disk) is shown; sets sitting entirely
on other, possibly-disconnected folders are not, since you can't act on them from this
run. Pass `-all-duplicates` for the whole-library view. (Your integration totals are
always deduped across the whole library, regardless of this flag.)

## Supported capture programs

Reads FITS from **N.I.N.A., ASIAIR, SharpCap, Ekos/KStars, Sequence Generator Pro,
Voyager, APT**, and does its best with anything else via header-keyword synonyms and a
filename fallback. Only **Light** frames count toward integration; calibration frames
(darks/flats/bias) are excluded. One-shot-colour (Bayer) frames bucket under an "OSC"
filter. Scope is FITS (`.fit`/`.fits`); a bad file is skipped, never fatal.

## Privacy

100% local. Nothing is uploaded automatically. Read-only — your captures are never
modified. And `celestory.json` carries **no local file paths**: the duplicate and
skipped-file lists that reference paths are shown only on the terminal, so your
folder layout never leaves your machine even when you upload the file.

## Troubleshooting & sharing logs

Every run appends to a debug log so problems can be diagnosed after the fact.

**Two report files, both written to the folder you ran the command from:**

- `celestory-error.log` — written **automatically when a run fails** (exit `1`),
  only if `-report` was not passed. Contains the entire debug log (all recent
  runs, up to the rotation cap). The error output names this file — attach it to
  your report.
- `celestory-report.log` — written whenever `-report` is passed, regardless of
  the outcome (success, error, or cancelled). Use this when a run *succeeded*
  but the numbers look wrong, or to capture context for any outcome: run
  `celestory -report` and attach the file it creates. When both `-report` is
  passed and a run fails, only `celestory-report.log` is written (not the error
  log).

To report a problem, open a [GitHub issue](https://github.com/sidthesloth92/db-astro-suite/issues/new),
attach the relevant file above, and describe what you were doing.

**Where the log lives** (the report files are copies of it):

| OS      | Location                                                          |
| ------- | ----------------------------------------------------------------- |
| macOS   | `~/Library/Caches/celestory/celestory.log`                        |
| Linux   | `$XDG_CACHE_HOME/celestory/celestory.log` (default `~/.cache/…`)  |
| Windows | `%LocalAppData%\celestory\celestory.log`                          |

The log records what each run was asked to do, per-file scan decisions, anything
skipped and why, and how the run ended. It rotates at 5 MiB with a single `.1`
backup.

**Privacy:** paths under your home directory are masked as `~` in the log, so it
never carries your username or home folder layout. Paths *outside* your home
(e.g. `/Volumes/T7/...`) appear as-is — glance over a report before attaching it
if that matters to you. Nothing is ever uploaded; the log and both report files
stay on your machine unless you share them.

## Build from source

The CLI lives in `tools/celestory/cli` (the web app is in `tools/celestory/app`):

```sh
cd tools/celestory/cli
go build -o celestory .
```

The FITS-reading core lives in the shared module `libs/astrofits`, referenced via a
`replace` directive in `tools/celestory/cli/go.mod`.
