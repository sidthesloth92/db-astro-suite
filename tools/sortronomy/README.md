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
- **18:00 session rollover.** A capture timestamp at or after 18:00 lands
  in the _following_ day's folder — long imaging nights stay together.
- **OSC filter tagging.** For one-shot-color cameras (or relabeling a mono
  filter slot), opt in to a "tag a filter" step and Sortronomy writes
  `FILTER = "<name>"` with your description as the comment into each copied
  file, plus appends `_f_<name>` before the extension.
- **Master-flat renamer.** A separate menu item renames master flats by the
  substring after their last underscore.
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

### `go install`

```bash
go install github.com/sidthesloth92/db-astro-suite/tools/sortronomy@latest
```

The binary will land at `$(go env GOPATH)/bin/sortronomy`.

### Direct download

Grab a pre-built archive from the [Releases page](https://github.com/sidthesloth92/db-astro-suite/releases?q=sortronomy).
Extract and move the `sortronomy` binary somewhere on your `PATH`.

## Usage

Just run it:

```bash
sortronomy
```

The wizard asks what you want to do, prompts for source / output directories,
asks whether to group by focal length and whether to tag a filter, and
confirms before doing anything.

For a one-off check that it's installed:

```bash
sortronomy --version
```

## Development

```bash
go run .                      # launch the wizard
go build -o sortronomy .      # build a local binary
goreleaser release --snapshot --clean   # dry-run the cross-platform release
```
