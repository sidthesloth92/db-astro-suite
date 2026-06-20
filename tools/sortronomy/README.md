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
  crosses midnight, plus the next morning's flats, stay together.
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

### Homebrew (macOS, Linux)

```bash
brew install --cask sidthesloth92/tap/sortronomy
```

### Scoop (Windows)

```powershell
scoop bucket add sidthesloth92 https://github.com/sidthesloth92/scoop-bucket
scoop install sortronomy
```

### Direct download

Grab a pre-built archive from the [Releases page](https://github.com/sidthesloth92/db-astro-suite/releases?q=sortronomy).
Extract and move the `sortronomy` binary somewhere on your `PATH`.

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
| `--rollover-hour N` | Hour (0–23) at which a night's session starts. Frames captured _at or after_ this hour are filed under the _next_ calendar day, so a night that crosses midnight — plus any flats shot the following morning — land in one session folder. Default 18. Only used when `--group-session` is set. |
| `--filter-type S`   | Folder label for the filter, e.g. `Ha` / `OIII`. Used as the subfolder name in the organized tree.                                                                                                                                                                                              |
| `--filter-name S`   | Value written into the FITS `FILTER` header of every copied file; also appended as `_f_<value>` before the file extension.                                                                                                                                                                      |
| `--filter-desc S`   | Comment written alongside the FITS `FILTER` header. Optional — leave it out if you don't need a description.                                                                                                                                                                                    |
| `--dry-run`         | Create the destination folders only — copy no files.                                                                                                                                                                                                                                            |
| `--yes`, `-y`       | Skip all prompts and run non-interactively.                                                                                                                                                                                                                                                     |
| `--debug`           | Verbose debug logging to the log file.                                                                                                                                                                                                                                                          |
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

| Code | Meaning                                                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Success — including a dry run, or when no FITS files were found.                                                                          |
| `1`  | Run failure — e.g. a file couldn't be copied. A debug report is saved for bug reports.                                                    |
| `2`  | Invalid usage — an unknown flag, a missing/invalid `--input`, or an incomplete filter. No report is written; the input just needs fixing. |

## Development

```bash
go run .                      # launch the wizard
go build -buildvcs=false  -o sortronomy .       # build a local binary
goreleaser release --snapshot --clean   # dry-run the cross-platform release
```
