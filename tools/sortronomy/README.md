# Sortronomy

> Organize astrophotography FITS files by camera, target, date, and filter — read straight from the headers.

Sortronomy is a small command-line wizard for cleaning up the mess that
astrophotography capture software leaves behind. It walks a folder of `.fit`
files, reads each file's FITS header, and copies them into a structured tree:

```
<output>/
└── 2600MM/                       # camera (normalized)
    └── 705/                      # focal length, rounded up to next 5 mm
        ├── NGC 281W/             # target (OBJECT keyword — spaces preserved)
        │   └── Light/
        │       ├── 2025-07-21 - OIII/
        │       └── 2025-07-22 - SII/
        └── _Calibration Frames/
            ├── Bias/
            ├── Dark/
            └── Flat/
```

It works for any capture software that writes standard FITS headers —
**ASIAIR, N.I.N.A., SharpCap, Ekos/KStars, SGP, Voyager, APT** — without
configuration, because every program writes the same `IMAGETYP`, `OBJECT`,
`INSTRUME`, `FILTER`, `DATE-OBS`, and `FOCALLEN` keywords.

## Features

- **Header-first parsing.** Filenames are used only as a fallback when a
  header field is missing.
- **Per-program normalization.** `"ZWO ASI2600MM Pro"` and `"ASI2600MM-Pro"`
  both fold to `2600MM` so the same camera under two capture programs
  doesn't fork your tree.
- **Opt-in date and session grouping.** Date grouping adds a dated subfolder
  per target; without it all frames for a target collect in one flat folder.
  Layer on "Group imaging session" and any capture at or after your chosen
  cutoff hour rolls into the _following_ day's folder — so a night that
  crosses midnight, plus the next morning's flats, stay together. The cutoff is
  matched against each frame's **local** capture time, read from the filename
  (ASIAIR, N.I.N.A., SharpCap and ISO timestamps), falling back to the `DATE-LOC`
  header and then the UTC `DATE-OBS`. Plain date grouping (no session) keeps
  filing under the `DATE-OBS` day.
- **Set filter.** For one-shot-color cameras (or relabeling a mono
  filter slot), opt in to the "set filter" step and Sortronomy writes
  `FILTER = "<name>"` with your description as the comment into each copied
  file, plus appends `_f_<name>` before the extension.
- **Dry run.** Preview the result without moving any data — `--dry-run` (or the
  review-screen choice) creates the destination folder tree only, copying no
  files, so you can inspect the layout first.
- **Scriptable.** Every wizard option has a CLI flag; add `--yes` to run
  non-interactively.
- **Idempotent.** Re-running on the same input doesn't overwrite anything
  already in place.

## Install

One line — nothing else to install. The script downloads the right binary for
your OS, verifies its checksum, and puts it on your `PATH`.

### macOS & Linux

```bash
curl -fsSL https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/sortronomy/scripts/install.sh | sh
```

No `curl`? Use `wget`:

```bash
wget -qO- https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/sortronomy/scripts/install.sh | sh
```

Installs to `~/.local/bin`. The script is small and [public](scripts/install.sh) —
read it first if you'd rather not pipe it straight to a shell.

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/sortronomy/scripts/install.ps1 | iex
```

Installs `sortronomy.exe` to `%LOCALAPPDATA%\Programs\Sortronomy` and adds it to your PATH.

### Upgrade

Re-run the same install command — it replaces the binary in place with the latest release.

### Uninstall

```bash
sortronomy --uninstall
```

Removes the binary. Your saved settings and log (a few KB) are left alone — delete
`~/.config/sortronomy` and `~/.cache/sortronomy` by hand if you want those gone too.

### Manual download

Prefer to grab it yourself? Download the archive for your platform from the
[Releases page](https://github.com/sidthesloth92/db-astro-suite/releases?q=sortronomy),
extract it, and move the `sortronomy` binary onto your `PATH`.

> **Coming soon:** one-line installs via **Homebrew**, **Scoop**, and **winget**
> in a following release.

## Usage

Just run it:

```bash
sortronomy
```

The wizard prompts for input / output directories, asks whether to group by
focal length, whether to group the imaging session (rolling late captures into
the next day), and whether to set a filter, then confirms before doing anything.

### Flags

Every wizard option also has a flag. Passed on their own they **pre-fill** the
wizard (which still shows a review); add `--yes` to skip all prompts and run
straight from the flags + saved config.

```bash
# Pre-fill the wizard, then review interactively:
sortronomy --input ./raw --output ./organized --group-focal

# Run non-interactively (scriptable):
sortronomy --input ./raw --output ./organized --group-focal --yes
```

| Flag                | What it does                                                                                                                                                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--input DIR`       | Folder of images to organize. Required to run with `--yes`; must exist.                                                                                                                                                                                                                         |
| `--output DIR`      | Where organized copies are written (blank = `./output`).                                                                                                                                                                                                                                        |
| `--group-focal`     | Group by the camera's focal length.                                                                                                                                                                                                                                                             |
| `--group-date`      | Include the capture date as a folder level in the tree. When off, all frames for a target land in one folder regardless of date.                                                                                                                                                                |
| `--group-filter`    | File frames into per-filter subfolders (e.g. `Ha/`, `OIII/`). When off, all frames for a target collect together regardless of filter.                                                                                                                                                          |
| `--group-session`   | Roll captures at/after the cutoff hour into the next day's session folder. Only applies when `--group-date` is set.                                                                                                                                                                             |
| `--rollover-hour N` | Local-time hour (0–23) at which a night's session starts. Frames captured _at or after_ this hour are filed under the _next_ calendar day, so a night that crosses midnight — plus any flats shot the following morning — land in one session folder. The local capture time is read from the filename when possible (ASIAIR, N.I.N.A., SharpCap…), else the `DATE-LOC` header, else the UTC `DATE-OBS` (with a warning). Default 18. Only used when `--group-session` is set. |
| `--filter-type S`   | Folder label for the filter, e.g. `Ha` / `OIII`. Used as the subfolder name in the organized tree.                                                                                                                                                                                              |
| `--filter-name S`   | Value written into the FITS `FILTER` header of every copied file; also appended as `_f_<value>` before the file extension.                                                                                                                                                                      |
| `--filter-desc S`   | Comment written alongside the FITS `FILTER` header. Optional — leave it out if you don't need a description.                                                                                                                                                                                    |
| `--dry-run`         | Create the destination folders only — copy no files.                                                                                                                                                                                                                                            |
| `--yes`, `-y`       | Skip all prompts and run non-interactively.                                                                                                                                                                                                                                                     |
| `--report`          | Also save the entire debug log as `sortronomy-report.log` in the current folder when this run finishes — success, error, or cancelled — for attaching to a bug report. See [Troubleshooting & sharing logs](#troubleshooting--sharing-logs).                                                    |
| `-h`, `--help`      | Show the tool description and every option.                                                                                                                                                                                                                                                     |
| `-v`, `--version`   | Print the version and exit.                                                                                                                                                                                                                                                                     |

**About the filter flags** (`--filter-type`, `--filter-name`, `--filter-desc`): these are for
one-shot-color (OSC) cameras, or when you want to relabel a mono filter slot. When any
`--filter-*` flag is present, Sortronomy engages filter mode: it writes `FILTER = "<name>"` (with
the description as the FITS comment) into each copied file's header, and appends `_f_<name>` to
the filename — so `frame_0001.fit` becomes `frame_0001_f_SV220.fit`. With no `--filter-*` flag,
files are filed under their own existing FITS `FILTER` header and nothing is rewritten.

Both `--filter-type` and `--filter-name` are required when filter mode is engaged; `--filter-desc` is always optional.

### Dry run

`--dry-run` (or the **Dry run — create folders only** choice on the review
screen) builds the full destination tree on disk **without copying a single
file**, so you can open it in Finder/Explorer and check the layout before moving
gigabytes of data. A later real run over the same paths fills the folders in —
nothing is overwritten.

```bash
sortronomy --input ./raw --output ./organized --dry-run --yes
```

### Exit codes

Handy when scripting with `--yes`:

| Code  | Meaning                                                                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`   | Success — including a dry run, or when no FITS files were found.                                                                               |
| `1`   | Run failure — e.g. a file couldn't be copied. The entire debug log is saved as `sortronomy-error.log` in the folder you ran from (or as `sortronomy-report.log` if `--report` was passed). |
| `2`   | Invalid usage — an unknown flag, a missing/invalid `--input`, or an incomplete filter. No report is written; the input just needs fixing.      |
| `130` | Cancelled — Ctrl-C pressed inside a wizard prompt. No report is written. (Choosing **Cancel** on the review screen is a normal exit, `0`.)     |

### Troubleshooting & sharing logs

Every run appends to a debug log so problems can be diagnosed after the fact — including runs
that finish without an error but produce a folder layout you didn't expect.

**Two report files, both written to the folder you ran the command from:**

- `sortronomy-error.log` — written **automatically when a run fails** (exit `1`), only if `--report`
  was not passed. Contains the entire debug log (all recent runs, up to the rotation cap). The error
  output names this file — attach it to your report.
- `sortronomy-report.log` — written whenever `--report` is passed, regardless of the outcome
  (success, error, or cancelled). Contains the entire debug log (all recent runs, up to the rotation
  cap). Use this when a run *succeeded* but the output looks wrong, or when you want to capture
  context for any outcome: run `sortronomy --report` and attach the file it creates. When both
  `--report` is passed and a run fails, only `sortronomy-report.log` is written (not the error log).

To report a problem, open a [GitHub issue](https://github.com/sidthesloth92/db-astro-suite/issues/new),
attach the relevant file above, and describe what you were doing.

**Where the log lives** (the report files are copies of it):

| OS      | Location                                                              |
| ------- | --------------------------------------------------------------------- |
| macOS   | `~/Library/Caches/sortronomy/sortronomy.log`                          |
| Linux   | `$XDG_CACHE_HOME/sortronomy/sortronomy.log` (default `~/.cache/…`)    |
| Windows | `%LocalAppData%\sortronomy\sortronomy.log`                            |

The log records what each run was asked to do (every option), what was decided per file
(source → destination and the metadata that drove it), anything skipped and why, and how the run
ended. The log rotates at 5 MiB with a single `.1` backup.

**Privacy:** paths under your home directory are masked as `~` in the log, so it never carries
your username or home folder layout. Paths *outside* your home (e.g. `/Volumes/T7/...`) appear
as-is — glance over a report before attaching it if that matters to you. Nothing is ever
uploaded; the log and both report files stay on your machine unless you share them.

## Development

```bash
go run ./cmd/sortronomy                                    # launch the wizard
go build -buildvcs=false -o sortronomy ./cmd/sortronomy    # build a local binary
goreleaser release --snapshot --clean                      # dry-run the cross-platform release
```

## License

Sortronomy is part of the [DB Astro Suite](https://dbastrosuite.com) and is released under the
[MIT License](../../LICENSE).
