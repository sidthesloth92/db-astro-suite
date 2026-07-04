# Celestory CLI — Design

This document explains **every CLI option** and **every source file** in the
Celestory command-line tool, and how they fit together. It is the internal
counterpart to the user-facing [README.md](tools/celestory/README.md).

> The CLI scans a folder of astrophotography **FITS** files, reads only their
> **headers** (never pixel data), and emits a single `celestory.json` describing
> every target imaged, the equipment/filters used, and integration hours per
> target over time. It is **read-only** — it never moves, renames, or deletes any
> capture.

---

## 1. Pipeline at a glance

```
                       ┌──────────────────────────────────────────────┐
  flags / wizard  ──▶  │  resolve inputs (source dir, output path)     │   run.go
                       └──────────────────────────────────────────────┘
                                        │
                                        ▼
  walk + parse FITS headers  ──▶  scan.Scan ───────────────▶ []Frame + []Skipped
  (bounded worker pool, cache)        internal/scan              + cache (internal/cache)
                                        │
                                        ▼
  enrich: drop calibration/masters,    aggregate.Enrich ──────▶ []LightFrame
  resolve identity + filter + FrameFP   internal/aggregate         (internal/identity,
                                        │                            internal/fingerprint)
                                        ▼
  fold this scan into the cumulative    library.Merge ─────────▶ library.Union()
  library index (root-partitioned)      internal/library          (dedup across all disks)
                                        │
                                        ▼
  dedup by FrameFP, roll up per         aggregate.Assemble ────▶ model.Ledger
  target / night / equipment, summary   (internal/equipment,
                                        │  internal/model)
                                        ▼
  stamp install/profile id + data       config / fingerprint
  fingerprint, strip local paths        run.go
                                        │
                                        ▼
  write celestory.json + print summary  report.WriteFile ──────▶ celestory.json
                                        summary.go / banner.go
```

Each stage is an isolated package with a single responsibility (SRP). Packages
depend **inward** only: `aggregate`/`library` never import the CLI `main`
package; `equipment` declares its own `Usage` input type so it does not import
`aggregate` (avoiding an import cycle); `scan` declares the `Cache` and
`MetadataReader` interfaces at the consumer side so it can be tested with fakes.

---

## 2. CLI options

All flags are declared in [`parseFlags`](tools/celestory/cli/main.go) and consumed by
[`run`](tools/celestory/cli/run.go). Flags use Go's standard single-dash style
(`-input`, also accepts `--input`). With **no `-input` and an interactive
terminal**, the tool launches the guided wizard instead of requiring flags.

### 2.1 Core scan options

| Flag                | Type   | Default | Behaviour |
| ------------------- | ------ | ------- | --------- |
| `-input <dir>`      | string | `""`    | Folder of FITS captures to scan recursively. Omit it on a terminal to launch the wizard. Required (or the wizard) for a scan. |
| `-out <dir\|.json>` | string | cwd     | Where `celestory.json` is written. A `.json` path names the file directly; any other value is treated as a directory (created if missing); empty means the current working directory. Resolved by [`resolveOutputs`](tools/celestory/cli/output.go). |

### 2.2 Cache options

The incremental parse cache lets re-scans skip unchanged files. See §5.2. It is
fully automatic (change detection is `size + mtime` — sufficient for write-once
capture files); the single flag opts out of it for a run, and `-reset` clears it
alongside the library index.

| Flag        | Type | Default | Behaviour |
| ----------- | ---- | ------- | --------- |
| `-no-cache` | bool | false   | Do not read or write the cache at all this run. |

### 2.3 Duplicate-report scoping

Integration totals are **always** deduped across the whole library; this flag
only widens what the duplicate **report** lists. See §6.2.

| Flag              | Type | Default | Behaviour |
| ----------------- | ---- | ------- | --------- |
| `-all-duplicates` | bool | false   | Report duplicate sets across the whole indexed library. By default the report is scoped to sets with at least one copy under the scanned folder (the actionable view); a hint counts how many more exist elsewhere. |

### 2.4 Cumulative library-index maintenance

The cumulative index (§5.3) remembers every disk ever scanned so totals span the
whole library even when one disk is disconnected. These flags maintain it. The
destructive ones (`-reset`, `-fresh`, `-forget`) prompt for confirmation via
[`confirmDestructive`](tools/celestory/cli/run.go) and refuse on a non-interactive
stdin unless `-yes` is passed. **FITS files are never touched** by any of them.

| Flag             | Type   | Default | Behaviour |
| ---------------- | ------ | ------- | --------- |
| `-keep-deleted`  | bool   | false   | When merging a re-scan, keep frames whose files vanished from the folder if they were the *last* copy (legacy append-only mode). By default the scanned folder is reconciled to exactly its current files, so culled subs un-count. See [`Index.Merge`](tools/celestory/cli/internal/library/library.go). |
| `-fresh`         | bool   | false   | Wipe the cumulative index, then rebuild it from this one scan. |
| `-reset`         | bool   | false   | Wipe **both** the cumulative index and the scan cache, then exit (no scan) — the full clean slate. |
| `-forget <dir>`  | string | `""`    | Drop a single folder partition (a disk you no longer own) from the index and exit. |
| `-yes`           | bool   | false   | Skip the confirmation prompt for `-reset` / `-fresh` / `-forget` (required for those operations in scripts/CI). |

### 2.5 Identity & informational

| Flag                 | Type   | Default | Behaviour |
| -------------------- | ------ | ------- | --------- |
| `-profile <handle>`  | string | `""`    | Persist your Celestory username (an identifier, **never** a password). Pre-fills the publish form and acts as a stable owner anchor across machines. Passing `-profile ""` explicitly clears it. A profile-only invocation (no `-input`) saves and exits. Distinguished from "absent" via [`wasFlagPassed`](tools/celestory/cli/main.go). |
| `-config`            | bool   | false   | Print the output, cache, history-index, and config-file locations, then exit ([`showConfig`](tools/celestory/cli/run.go)). |
| `-v`, `-version`     | bool   | false   | Print the version (injected at build time) and exit. |

> **Note:** the README's "Flags" table intentionally lists only the everyday
> subset. The maintenance and identity flags above (`-profile`, `-all-duplicates`,
> `-keep-deleted`, `-fresh`, `-reset`, `-forget`, `-yes`) are the full set parsed
> by the binary.

### 2.6 Wizard (no-argument run)

With no `-input` on an interactive terminal, [`run`](tools/celestory/cli/run.go)
launches [`wizard.Run`](tools/celestory/cli/internal/wizard/wizard.go), a `huh`
form that asks three questions — source folder, output folder, and optional
username — each pre-filled from the last run's saved config, with Tab folder
auto-completion. Esc / Ctrl+C aborts cleanly.

---

## 3. Top-level files (`package main`)

| File | Responsibility |
| ---- | -------------- |
| [main.go](tools/celestory/cli/main.go) | Entry point. Declares the `cliFlags` struct, parses flags, prints version, dispatches to `run`, maps a returned error to a non-zero exit. |
| [run.go](tools/celestory/cli/run.go) | The orchestrator. Resolves inputs (flags or wizard), opens the cache + library index, runs the scan, folds it into the index (then heals moved-file references via `ReconcileMoved`), assembles the ledger, stamps identity, strips local paths, writes the JSON, prints the summary. Also hosts the index-maintenance operations (`resetAll`, `forgetRoot`), `showConfig`, and interactivity/confirmation helpers. |
| [probe.go](tools/celestory/cli/probe.go) | `osProbe`: the `os.Stat`-backed `library.DiskProbe` used for real runs. Reports a file as existing on any error other than a certain not-exist, so the heal never drops an entry it could not verify. |
| [output.go](tools/celestory/cli/output.go) | [`resolveOutputs`](tools/celestory/cli/output.go): decides the final `celestory.json` path from `-out` (empty → cwd, `.json` → file, else → directory). |
| [summary.go](tools/celestory/cli/summary.go) | Terminal summary rendering: headline stats, the colour-coded duplicate report, the skipped-files list, and the "Next steps" call-to-action. Holds the print caps, duration/byte formatters, and `lipgloss` styles. |
| [banner.go](tools/celestory/cli/banner.go) | The startup brand banner: the procedurally-rendered crescent-moon mark (teal→pink gradient) beside the `CELESTORY` wordmark and version. |
| [progress.go](tools/celestory/cli/progress.go) | `progressReporter`: an in-place, throttled `[bar] pct done/total` line during the scan. Silent when stderr is not a terminal (so piped logs stay clean). |

---

## 4. Internal packages (`internal/…`)

Each package owns one stage of the pipeline. Models, constants, and helpers live
in their own files per the repo's file-naming conventions.

### 4.1 `internal/scan` — directory walk + concurrent header read
[scan.go](tools/celestory/cli/internal/scan/scan.go)

- Walks the source tree for `.fit`/`.fits` files (dotfiles and unreadable
  subtrees skipped, never fatal).
- Reads each header through a bounded worker pool (defaults to `runtime.NumCPU()`),
  consulting the cache first and parsing on a miss.
- `safeRead` converts even a panicking reader into a `Skipped` entry — a bad file
  is reported, never fatal.
- Declares the consumer-side `MetadataReader` and `Cache` interfaces, plus the
  `Frame`, `Skipped`, `Result`, and `Options` types. Cancels early on context.

### 4.2 `internal/cache` — incremental on-disk parse cache
[cache.go](tools/celestory/cli/internal/cache/cache.go)

- One JSON file per scanned root, namespaced by a hash of the absolute root path,
  in the OS user-cache dir.
- Change detection: `size + mtime` (one stat, no bytes read) — sufficient for
  write-once capture files. A `SchemaVersion` (currently **2**) invalidates
  entries after a parser upgrade.
- Thread-safe (`sync.Mutex`); `Save` prunes entries for files not seen this run.
  A corrupt cache file is non-fatal — it starts fresh. `Purge` removes every
  per-root cache file (backing `-reset`).

### 4.3 `internal/aggregate` — FITS frames → domain ledger
[aggregate.go](tools/celestory/cli/internal/aggregate/aggregate.go) ·
[light_frame.go](tools/celestory/cli/internal/aggregate/light_frame.go) ·
[duplicates.go](tools/celestory/cli/internal/aggregate/duplicates.go)

- `Enrich`: drops calibration frames + stacked masters (header `NCOMBINE>1` or
  filename hints like `master`/`stack`), resolves each light frame's identity,
  filter, coordinates, and `FrameFP` → `[]LightFrame`.
- `DetectDuplicates`: groups frames by `FrameFP`, keeps the lexicographically-first
  path per set, reports the rest; `ScopeToRoot` / `OutsideRootDuplicateSets`
  implement the folder-scoped duplicate view; `FilterVerifiable` suppresses
  copies that cannot be checked right now (disconnected disks) from the report
  without touching integration totals.
- `BuildTargets` / `Summarize` / `byCategory` / `activityByNight`: per-target,
  per-night, per-filter, and per-category roll-ups + the global summary.
- `Assemble` is the entry point used by `run.go`; `Build` is a one-shot
  convenience (scan → ledger) used in tests. Holds the JSON-contract
  `SchemaVersion` (currently **3**).

### 4.4 `internal/identity` — target & filter canonicalisation
[catalog.go](tools/celestory/cli/internal/identity/catalog.go) ·
[resolver.go](tools/celestory/cli/internal/identity/resolver.go) ·
[classifier.go](tools/celestory/cli/internal/identity/classifier.go) ·
[filter_normalizer.go](tools/celestory/cli/internal/identity/filter_normalizer.go) ·
[data/catalog.json](tools/celestory/cli/internal/identity/data/catalog.json)

- Resolves a raw `OBJECT` string to a single identity, merging cross-catalog
  aliases (e.g. `M 31` == `NGC 224`) via the embedded seed catalog
  (`//go:embed data/catalog.json`).
- `canonicalizeDesignation` parses messy designations (`m31`, `M 31`,
  `ngc 224 - andromeda`) via a prefix regex; un-seeded but recognised
  designations still resolve, and freeform targets degrade gracefully (never
  dropped).
- `classifier.go` maps targets to coarse UI categories (Galaxy, Nebula, …).
- `NormalizeFilter` collapses the many spellings of a filter to a canonical label
  (`Hα`, `OIII`, `SII`, `L`, `RGB`, …), stripping bandwidth specs (`7nm`) and
  preserving unknown/dual-band filters.

### 4.5 `internal/fingerprint` — frame identity + data fingerprint
[frame_fingerprint.go](tools/celestory/cli/internal/fingerprint/frame_fingerprint.go) ·
[fingerprint.go](tools/celestory/cli/internal/fingerprint/fingerprint.go)

- `FrameFingerprint`: a stable, content- and path-independent SHA-256 over the
  acquisition headers (camera + sub-second `DATE-OBS` + exposure/gain/binning/
  filter). Deliberately excludes target name, file size, path, and pixel data, so
  the same photons keep one identity however the file is copied or relabelled.
  This is the dedup key (`FrameFP`).
- `WeakFingerprint`: the fallback for an **undated** frame — a hash of the leading
  header bytes (tagged `w:`), flagged as a weak identity by callers.
- `Compute`: the ledger-level **data fingerprint** — a stable hash over the
  normalised target set (ignoring `generatedAt` and ordering) so re-uploading an
  unchanged library is recognised as the same data, not a new upload.

### 4.6 `internal/equipment` — gear registry
[normalize.go](tools/celestory/cli/internal/equipment/normalize.go) ·
[registry.go](tools/celestory/cli/internal/equipment/registry.go)

- Turns raw `INSTRUME`/`TELESCOP`/`FOCALLEN` values into stable equipment IDs
  (`cam-2600mm`, `telescope-redcat-51`, `telescope-250mm`, `mount-eqmod-mount`) and
  friendly display names. A `TELESCOP` value recognised as a mount (name heuristic
  in `mount.go`) becomes a `mount` instead of a `telescope`.
- `BuildRegistry` collapses per-frame `Usage`s into a deduped list of distinct
  cameras + telescopes + mounts, each with aggregate stats and a reverse index of
  the targets shot with it (cameras before telescopes before mounts, then by
  integration descending).

### 4.7 `internal/library` — cumulative, root-partitioned index
[library.go](tools/celestory/cli/internal/library/library.go) ·
[reconcile.go](tools/celestory/cli/internal/library/reconcile.go)

- Persists every light frame ever indexed across **all** scanned disks, deduped
  by `FrameFP`, as `library.json` in the config dir (separate from the parse
  cache). Layout: `folders` (folderAbs → fileRel → frameFP) + `frames`
  (frameFP → record).
- `Merge` folds a fresh scan into one root partition: by default reconciles the
  folder to exactly its current files; `-keep-deleted` switches to append-only
  semantics that protect the last copy of a culled sub.
- `ReconcileMoved` heals stale references after a move (see §6.4), and
  `VerifiablePath` builds the reachability predicate the duplicate report uses.
  Both take the consumer-side `DiskProbe` interface so tests never touch the
  filesystem.
- `Union` rebuilds the deduped `[]LightFrame` across all partitions (the ledger is
  built from this, not from a single scan). `Forget` / `Reset` back the
  index-maintenance flags. `compact` garbage-collects unreferenced frame records.

### 4.8 `internal/model` — JSON contract types
[ledger.model.go](tools/celestory/cli/internal/model/ledger.model.go) ·
[target_timeline.model.go](tools/celestory/cli/internal/model/target_timeline.model.go) ·
[equipment_item.model.go](tools/celestory/cli/internal/model/equipment_item.model.go) ·
[session.model.go](tools/celestory/cli/internal/model/session.model.go) ·
[filter_integration.model.go](tools/celestory/cli/internal/model/filter_integration.model.go)

The domain types marshaled into `celestory.json` (one concept per file):
`Ledger` (root), `ToolInfo`, `Summary`, `CategoryStat`, `ActivityEntry`,
`DuplicateSet`, `SkippedEntry`, `TargetTimeline`, `EquipmentItem`, `Session`,
`FilterIntegration`, `FilterTotal`. These define the v3 schema the web app reads.

### 4.9 `internal/report` — JSON serialiser
[report.go](tools/celestory/cli/internal/report/report.go)

`WriteJSON` / `WriteFile`: pretty-printed UTF-8 with HTML escaping disabled so
canonical labels like `Hα` stay readable.

### 4.10 `internal/config` — persisted preferences
[config.go](tools/celestory/cli/internal/config/config.go)

Small JSON config (`config.json`) in the OS user-config dir: the cache location,
last input/output dirs (to pre-fill the wizard), a stable random `InstallID`
(created on first run, survives cache clears), and the optional `ProfileID`. A
missing file is treated as "no preference yet", not an error.

### 4.11 `internal/wizard` — interactive flow
[wizard.go](tools/celestory/cli/internal/wizard/wizard.go)

The `huh`-based three-question form for no-argument runs (source folder, output
folder, optional username), with Tab folder auto-completion, directory
validation, and clean abort handling.

---

## 5. On-disk state

The CLI manages four kinds of files; `-config` prints all of their locations.
All of them are written **atomically** (temp file + rename via
[`internal/atomicwrite`](tools/celestory/cli/internal/atomicwrite/atomicwrite.go)):
a crash or interrupt can never leave a truncated, corrupt file — which matters
most for `library.json`, whose corruption would otherwise silently read as an
empty library. A side benefit: each write installs a genuinely new file, so
`celestory.json`'s creation time always reflects the last generation.

| File | Location | Owner | Purpose |
| ---- | -------- | ----- | ------- |
| `celestory.json` | the `-out` path (default cwd) | [report](tools/celestory/cli/internal/report/report.go) | The uploadable ledger. **Local file paths are stripped** before writing (see §6.1). |
| `config.json` | OS user-config dir `…/celestory/` | [config](tools/celestory/cli/internal/config/config.go) | Cache dir, last input/output dirs, `InstallID`, `ProfileID`. |
| `library.json` | OS user-config dir `…/celestory/` | [library](tools/celestory/cli/internal/library/library.go) | The cumulative cross-disk index. |
| `<root-hash>.json` | OS user-cache dir `…/celestory/` | [cache](tools/celestory/cli/internal/cache/cache.go) | Per-root incremental parse cache. |

### 5.1 Output vs. cache vs. index — why three stores
- **Cache** is per-folder and disposable (clear it any time; safe to delete).
- **Library index** is global and cumulative — it is what makes totals survive a
  disconnected disk. It lives in the config dir (not the cache) so a cache clear
  never forgets your history.
- **Config** holds identity (`InstallID`/`ProfileID`) and is the smallest, most
  durable store.

---

## 6. Key design decisions

### 6.1 The uploaded file carries no local paths (privacy)
`celestory.json` is uploaded to the web app, so before writing,
[`run`](tools/celestory/cli/run.go) clones the ledger and clears the
`Duplicates` and `Skipped` arrays (the only fields that hold filesystem paths).
The **path-free counts** survive in `summary` (`duplicateFileCount`,
`duplicateWastedBytes`, `skippedFileCount`); the full per-file lists are shown on
the **terminal only**, where paths are safe.

### 6.2 Totals are whole-library; the duplicate report is folder-scoped
Integration is always deduped across the full `library.Union()`, so a
disconnected disk's frames still count. The duplicate **report**, by contrast, is
scoped by default to sets with a copy under the scanned folder (the only ones you
can act on this run); `-all-duplicates` widens it, and a hint counts the hidden
sets. Copies on unreachable disks are additionally suppressed from the report —
they cannot be verified right now — while their index entries (and totals) stay.

### 6.3 Content-based dedup, not path-based
Duplicates are detected by `FrameFP` (acquisition-header identity), so the same
sub copied to a backup folder, renamed, or re-saved is counted once — while two
genuinely different exposures (different sub-second `DATE-OBS`) stay separate.
Undated frames fall back to a weak content hash, and ultimately to their path, so
a frame is **always** counted and never silently merged away.

### 6.4 Moves heal; disconnected disks are sacred
Moving files between folders must not create phantom duplicates. After each
merge, [`ReconcileMoved`](tools/celestory/cli/internal/library/reconcile.go)
treats the just-scanned folder as the source of truth and, for each of its
frames that another folder also references, applies:

| Other root | Old copy on disk | Action |
| ---------- | ---------------- | ------ |
| reachable | still there | genuine backup — kept and reported as a duplicate |
| reachable | gone | moved/deleted — the stale index entry is dropped (self-heal) |
| unreachable | unverifiable | entry kept untouched; the report suppresses the copy |

Only frames also present under the scanned root are ever considered, so a heal
can never remove the last record of a frame or change integration totals. No
FITS file is ever touched — only index entries. The rule is symmetric: scanning
the other folder later reconciles in the opposite direction.

### 6.5 Schema versions
Three independent version constants guard against silent drift:

| Constant | File | Guards |
| -------- | ---- | ------ |
| `aggregate.SchemaVersion` (2) | [aggregate.go](tools/celestory/cli/internal/aggregate/aggregate.go) | the `celestory.json` JSON contract — bumped on incompatible shape changes so the web app can flag stale ledgers. |
| `cache.SchemaVersion` (2) | [cache.go](tools/celestory/cli/internal/cache/cache.go) | the parse cache — bumped when metadata extraction changes so old entries are re-parsed. |
| `fingerprint.FrameSchema` (1) | [frame_fingerprint.go](tools/celestory/cli/internal/fingerprint/frame_fingerprint.go) | the frame-fingerprint recipe — folded into the hash so old identities never mix with new ones. |

---

## 7. Shared dependency: `libs/astrofits`

The FITS-reading core is **not** in this CLI — it lives in the shared module
[`libs/astrofits`](libs/astrofits/), referenced via a `replace` directive in
[go.mod](tools/celestory/cli/go.mod). It owns the actual file parsing
(`ReadMetadata`, `IsFITS`, `IsCalibration`, `NormalizeCamera`) and the
`Metadata` struct (frame type, target, camera, filter, `DATE-OBS`, RA/Dec,
focal/f-ratio, exposure, gain, binning, Bayer pattern, stack count, detected
capture program, raw header values). The CLI consumes `Metadata` and never reads
FITS bytes itself.

---

## 8. Build, release & dev aids

| File | Purpose |
| ---- | ------- |
| [go.mod](tools/celestory/cli/go.mod) / `go.sum` | Module deps: `astrogo/fitsio` (FITS), the `charmbracelet` stack (`huh`, `lipgloss`, `x/term`) for the TUI, and the local `libs/astrofits` via `replace`. |
| [.goreleaser.yaml](tools/celestory/cli/.goreleaser.yaml) | Cross-builds static binaries (darwin/linux/windows × amd64/arm64, `CGO_ENABLED=0`), injects the version via `-ldflags -X main.version`, and publishes Homebrew cask + Scoop manifests to the tap repos. |
| [.gitignore](tools/celestory/cli/.gitignore) | Ignores GoReleaser `dist/` and the local-only `celestory` dev binary. |
| [cmd/genfixtures/main.go](tools/celestory/cli/cmd/genfixtures/main.go) | **Dev aid (not shipped):** writes a small tree of real FITS files (varied targets/filters/cameras/dates, a duplicate, an undated OSC frame, a calibration frame, and a garbage file) for exercising the CLI end-to-end. |

To build locally:

```sh
cd tools/celestory/cli
go build -o celestory .
```

The web app that consumes `celestory.json` is a separate project under
[tools/celestory/app](tools/celestory/app).
