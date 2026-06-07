# Celestory

**Your astrophotography imaging history, read straight from your files.**

Point Celestory at a folder of captures and it recursively reads the **FITS
headers** (never the pixel data), figures out every **object** you've imaged, the
**equipment** and **filters** you used, and the **integration hours per object over
time** — then writes a single `ledger.json`. Upload it to the
[Celestory web app](https://celestory.dbastrosuite.com) to chart your journey.

Everything runs **locally**. Your files never leave your machine, and Celestory
is **read-only** — it never moves, renames, or deletes anything.

---

## Install

No runtime to install — it's a single static binary.

```sh
# Homebrew (macOS / Linux)
brew install sidthesloth92/tap/celestory

# Scoop (Windows)
scoop bucket add sidthesloth92 https://github.com/sidthesloth92/scoop-bucket
scoop install celestory
```

…or download a binary for your OS/arch from the
[GitHub Releases](https://github.com/sidthesloth92/db-astro-suite/releases) page
(macOS, Linux, Windows × amd64/arm64).

## Quick start

**Easiest — just run it and follow the prompts:**

```sh
celestory
```

The wizard asks which folder your images are in and where to save `ledger.json`,
then scans and writes it. Drop that file onto the Celestory web app to visualise.

**Scriptable:**

```sh
celestory -input /path/to/captures -out /path/to/output
```

## See your stats

Open the [Celestory web app](https://celestory.dbastrosuite.com) and drop your
`ledger.json` onto the page. It renders **100% in your browser** — nothing is
uploaded, and your data never leaves your machine. From there you can explore your
whole imaging journey and export gallery-grade cards to share.

## Where your files are saved

By default `ledger.json` lands in the folder you ran the command from (the wizard
lets you choose). Celestory prints the full path when it finishes, and `-out`
overrides where it goes:

- `-out /some/dir` → writes `ledger.json` into that directory.
- `-out /some/dir/ledger.json` → names the file directly.

## Flags

The interface is intentionally small — most runs need none of these.

| Flag                | Description                                                         |
| ------------------- | ----------------------------------------------------------------- |
| `-input <dir>`      | Folder of FITS captures to scan (omit to launch the wizard).      |
| `-out <dir\|.json>` | Output directory or `.json` file. Default: current directory.     |
| `-rebuild-cache`    | Ignore the cache and re-parse every file, then rebuild it.        |
| `-no-cache`         | Don't read or write the scan cache.                               |
| `-verify-hash`      | Detect file changes by a FITS-header hash instead of size+mtime.  |
| `-config`           | Print the output, cache, and config locations, then exit.         |
| `-v`, `-version`    | Print the version and exit.                                       |

It always parses headers using all your CPU cores.

## How the cache works

Re-scanning a large library is wasteful, so Celestory remembers what it parsed. On
each run it `stat`s every file (one cheap syscall, no bytes read) and compares the
**size + modification time** against the cache — unchanged files are reused, only
new/changed files are parsed. Re-runs drop from minutes to seconds.

- `-rebuild-cache` re-parses everything and rebuilds the cache; `-no-cache` disables it entirely.
- `-verify-hash` swaps the size+mtime check for a hash of the FITS header bytes (more
  certain, a little more I/O).
- On the first interactive run you're asked where the cache should live (default: your
  OS cache directory); the choice is remembered. `-config` prints the location.

## Duplicates

If the same sub is sitting in two places (e.g. a working copy and a backup), it's
**counted once** toward your integration and **reported** so you know — Celestory
never deletes anything. Duplicates appear in `ledger.json → duplicates`, in the
summary, and on the terminal.

## Supported capture programs

Reads FITS from **N.I.N.A., ASIAIR, SharpCap, Ekos/KStars, Sequence Generator Pro,
Voyager, APT**, and does its best with anything else via header-keyword synonyms and a
filename fallback. Only **Light** frames count toward integration; calibration frames
(darks/flats/bias) are excluded. One-shot-colour (Bayer) frames bucket under an "OSC"
filter. Scope is FITS (`.fit`/`.fits`); a bad file is skipped, never fatal.

## Privacy

100% local. Nothing is uploaded. Read-only — your captures are never modified.

## Build from source

The CLI lives in `tools/celestory/cli` (the web app is in `tools/celestory/app`):

```sh
cd tools/celestory/cli
go build -o celestory .
```

The FITS-reading core lives in the shared module `libs/astrofits`, referenced via a
`replace` directive in `tools/celestory/cli/go.mod`.
