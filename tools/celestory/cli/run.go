package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"strings"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/aggregate"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/cache"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/config"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/fingerprint"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/library"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/report"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/scan"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/wizard"
)

// execute runs the full pipeline: resolve inputs → scan → aggregate → write
// celestory.json. The result is uploaded to the Celestory web app to visualise.
// Cancellation and invalid invocations are signalled with errCancelled /
// *usageError so run() can map them to the right exit code.
func execute(log *slog.Logger, f cliFlags) error {
	// Persist a configured username (just an identifier, never a password).
	if f.profileSet {
		if err := config.SetProfileID(f.profile); err != nil {
			return err
		}
		// Log presence only — the handle itself stays out of the shareable log.
		log.Info("profile updated", "cleared", f.profile == "")
		if f.profile == "" {
			fmt.Println("Cleared your Celestory username.")
		} else {
			fmt.Println("Saved your Celestory username:", f.profile)
		}
	}

	// Standalone cumulative-index maintenance operations.
	if f.reset {
		return resetAll(log, f.assumeYes)
	}
	if f.forget != "" {
		return forgetRoot(log, f.forget, f.assumeYes)
	}
	// A profile-only invocation (no folder to scan) is complete.
	if f.profileSet && f.input == "" {
		return nil
	}

	printBanner()

	interactive := f.input == "" && isInteractive()

	sourceDir := f.input
	baseOut := f.out
	cacheDir := resolveCacheDir()

	if interactive {
		cwd, _ := os.Getwd()
		cfg, _ := config.Load()
		outDefault := cfg.LastOutputDir
		if outDefault == "" {
			outDefault = cwd
		}
		choices, ok, err := wizard.Run(wizard.Choices{
			SourceDir: cfg.LastInputDir,
			OutputDir: outDefault,
			ProfileID: cfg.ProfileID,
		})
		if err != nil {
			return err
		}
		if !ok {
			return errCancelled
		}
		sourceDir = choices.SourceDir
		baseOut = choices.OutputDir
		log.Info("wizard confirmed",
			"input", sourceDir,
			"output", baseOut,
			"profileSet", choices.ProfileID != "")
		cfg.ProfileID = choices.ProfileID
		if err := config.Save(cfg); err != nil {
			log.Warn("could not save wizard settings", "err", err)
		}
	} else if sourceDir == "" {
		f.usage()
		return &usageError{msg: "no folder given: pass -input <dir>, or run with no arguments for the guided wizard"}
	}

	// A missing/unmounted/misspelled folder is an invalid invocation, not a
	// tool crash — it needs a fix, not a bug report.
	if err := validateInputDir(sourceDir); err != nil {
		return &usageError{msg: fmt.Sprintf("input directory: %v", err)}
	}

	jsonPath, err := resolveOutputs(baseOut)
	if err != nil {
		return err
	}
	log.Info("outputs resolved", "json", jsonPath)

	// Remember the input + output folders so the next interactive run pre-fills them.
	rememberDirs(log, sourceDir, filepath.Dir(jsonPath))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	var c *cache.Cache
	if f.noCache {
		log.Info("cache disabled (-no-cache)")
	} else {
		c, err = cache.Open(log, cacheDir, sourceDir)
		if err != nil {
			return err
		}
	}

	reader := func(p string) (astrofits.Metadata, error) { return astrofits.ReadMetadata(p) }

	prog := newProgressReporter(os.Stderr, os.Stderr.Fd())
	res, err := scan.Scan(ctx, scan.Options{
		Root:       sourceDir,
		Reader:     reader,
		Cache:      asScanCache(c),
		OnProgress: prog.update,
		Log:        log,
	})
	prog.clear()
	if err != nil {
		// A mid-scan Ctrl-C surfaces as context.Canceled and exits as cancelled.
		return err
	}
	if res.Total == 0 {
		log.Info("no FITS files found", "input", sourceDir)
		fmt.Println("No FITS files found under", sourceDir)
		return nil
	}

	// Fold this scan into the cumulative library index, then build the story
	// from the union across every disk ever scanned — not just this folder.
	lights, dropped := aggregate.Enrich(res.Frames)
	// Per-frame exclusions are logged at INFO on purpose: an "integration total
	// looks too low but nothing failed" report is debuggable from the log alone.
	for _, d := range dropped {
		log.Info("frame excluded", "file", d.Path, "reason", d.Reason)
	}
	log.Info("enrich complete", "lights", len(lights), "dropped", len(dropped))
	idx, err := library.Open(log, libraryDir())
	if err != nil {
		return err
	}
	if f.fresh {
		if err := confirmDestructive("Wipe the cumulative library index and rebuild from this scan? (FITS files are untouched)", f.assumeYes); err != nil {
			return err
		}
		idx.Reset()
		log.Warn("library index wiped (-fresh)")
	}
	idx.Merge(sourceDir, lights, f.keepDeleted)
	// Heal stale references left by files moved out of other (still reachable)
	// folders, so a move never shows up as a phantom duplicate.
	idx.ReconcileMoved(sourceDir, osProbe{})

	// Scope the duplicate report to the folder just scanned (unless -all-duplicates):
	// a set sitting entirely on another, possibly-disconnected disk isn't actionable
	// from this run. Integration totals stay full-library regardless. Copies on
	// unreachable disks can't be verified, so they're excluded from the report
	// (their index entries stay).
	dupRoot := ""
	if !f.allDuplicates {
		if abs, absErr := filepath.Abs(sourceDir); absErr == nil {
			dupRoot = abs
		} else {
			dupRoot = sourceDir
		}
	}
	logDuplicateScope(log, dupRoot)
	union := idx.Union()
	verifiable := idx.VerifiablePath(osProbe{})
	story := aggregate.Assemble(union, res.Skipped, model.ToolInfo{Name: "celestory", Version: version}, dupRoot, verifiable)
	hiddenDupSets := aggregate.OutsideRootDuplicateSets(union, dupRoot, verifiable)
	logStoryAssembled(log, story, hiddenDupSets)

	// Stamp a stable, privacy-preserving identity for deduped attempt counting.
	if installID, idErr := config.EnsureInstallID(); idErr == nil {
		story.InstallID = installID
	} else {
		log.Warn("install id unavailable", "err", idErr)
		fmt.Fprintln(os.Stderr, "warning: could not read install id:", idErr)
	}
	if cfg, cErr := config.Load(); cErr == nil {
		story.ProfileID = cfg.ProfileID
	} else {
		log.Warn("config load failed; profile not stamped", "err", cErr)
	}
	story.DataFingerprint = fingerprint.Compute(story)
	log.Info("fingerprint computed", "fingerprint", story.DataFingerprint)

	// celestory.json is uploaded to the web app, so it must not carry local file
	// paths. The duplicate sets and the skipped-file list both hold paths — write a
	// copy with them cleared (the path-free counts stay in the summary); the full
	// per-file reports are still shown on the terminal, where paths are safe.
	persisted := story
	persisted.Duplicates = []model.DuplicateSet{}
	persisted.Skipped = []model.SkippedEntry{}
	if err := report.WriteFile(jsonPath, persisted); err != nil {
		return err
	}
	log.Info("story written", "path", jsonPath)
	printRunSummary(story, jsonPath, hiddenDupSets)
	saveCache(log, c)
	if err := idx.Save(); err != nil {
		log.Warn("library save failed", "err", err)
		fmt.Fprintln(os.Stderr, "warning: could not write library index:", err)
	}
	return nil
}

// logDuplicateScope records whether the duplicate report covers the scanned
// folder or the whole library, so a "where did my duplicates go" report is
// answerable from the log.
func logDuplicateScope(log *slog.Logger, dupRoot string) {
	if dupRoot == "" {
		log.Info("duplicate scope", "root", "library")
		return
	}
	log.Info("duplicate scope", "root", dupRoot)
}

// logStoryAssembled records the assembled story's headline numbers and every
// duplicate set (with paths), mirroring what the terminal summary shows so a
// shared log carries the same picture the user saw.
func logStoryAssembled(log *slog.Logger, story model.Story, hiddenDupSets int) {
	s := story.Summary
	log.Info("story assembled",
		"targets", s.TargetCount,
		"nights", s.NightCount,
		"lightFrames", s.LightFrameCount,
		"integrationSeconds", s.TotalIntegrationSeconds,
		"duplicateSets", len(story.Duplicates),
		"duplicateFiles", s.DuplicateFileCount,
		"wastedBytes", s.DuplicateWastedBytes,
		"skipped", s.SkippedFileCount,
		"hiddenDupSets", hiddenDupSets)
	for _, d := range story.Duplicates {
		// The paths are joined into one string because the handler's home
		// masker only rewrites string (and error) attrs — a []string attr
		// would land in the shareable log unmasked.
		log.Info("duplicate set",
			"designation", d.Designation,
			"dateObs", d.DateObs,
			"sizeBytes", d.SizeBytes,
			"paths", strings.Join(d.Paths, ", "))
	}
}

// libraryDir returns where the cumulative index lives (the Celestory config dir).
func libraryDir() string {
	if d, err := library.DefaultDir(); err == nil {
		return d
	}
	return ".celestory"
}

// resetAll wipes both stores — the cumulative library index and the scan
// cache — after confirmation, giving a true clean slate. FITS files are never
// touched; the user rebuilds by re-scanning.
func resetAll(log *slog.Logger, assumeYes bool) error {
	idx, err := library.Open(log, libraryDir())
	if err != nil {
		return err
	}
	if err := confirmDestructive("Wipe your entire Celestory library index and scan cache? (FITS files are untouched; re-scan to rebuild)", assumeYes); err != nil {
		return err
	}
	idx.Reset()
	if err := idx.Save(); err != nil {
		return err
	}
	if err := cache.Purge(resolveCacheDir()); err != nil {
		log.Warn("cache purge failed", "err", err)
		fmt.Fprintln(os.Stderr, "warning: could not clear the scan cache:", err)
	}
	log.Info("library index and scan cache reset")
	fmt.Println("Library index and scan cache cleared. Re-scan your folders to rebuild.")
	return nil
}

// forgetRoot drops a single folder partition from the cumulative index.
func forgetRoot(log *slog.Logger, root string, assumeYes bool) error {
	idx, err := library.Open(log, libraryDir())
	if err != nil {
		return err
	}
	if err := confirmDestructive(fmt.Sprintf("Forget %q from your cumulative library index?", root), assumeYes); err != nil {
		return err
	}
	if !idx.Forget(root) {
		fmt.Println("That folder is not in the index; nothing changed.")
		return nil
	}
	if err := idx.Save(); err != nil {
		return err
	}
	fmt.Println("Forgot", root)
	return nil
}

// confirmDestructive asks the user to confirm a destructive index operation.
// It returns nil when confirmed, errCancelled when the user declines, and a
// *usageError on a non-interactive stdin without assumeYes, so scripts must
// opt in via -yes.
func confirmDestructive(prompt string, assumeYes bool) error {
	return confirmDestructiveFrom(os.Stdin, os.Stdout, isInteractive(), prompt, assumeYes)
}

// confirmDestructiveFrom is the stdin/tty-injected core of confirmDestructive,
// kept separate so the decline → cancelled and unattended → usage exit
// contract is testable without a terminal.
func confirmDestructiveFrom(in io.Reader, out io.Writer, interactive bool, prompt string, assumeYes bool) error {
	if assumeYes {
		return nil
	}
	if !interactive {
		return &usageError{msg: "refusing without confirmation; re-run with -yes to proceed"}
	}
	fmt.Fprintf(out, "%s [y/N]: ", prompt)
	scanner := bufio.NewScanner(in)
	if !scanner.Scan() {
		return errCancelled
	}
	answer := strings.ToLower(strings.TrimSpace(scanner.Text()))
	if answer == "y" || answer == "yes" {
		return nil
	}
	return errCancelled
}

func asScanCache(c *cache.Cache) scan.Cache {
	if c == nil {
		return nil
	}
	return c
}

func saveCache(log *slog.Logger, c *cache.Cache) {
	if c == nil {
		return
	}
	if err := c.Save(); err != nil {
		log.Warn("cache save failed", "err", err)
		fmt.Fprintln(os.Stderr, "warning: could not write cache:", err)
		return
	}
	log.Info("cache saved", "path", c.Path())
}

// rememberDirs persists the scanned and output folders so the wizard can
// pre-fill them on the next run. Best-effort: failures are non-fatal — a
// failed save is logged but never surfaced.
func rememberDirs(log *slog.Logger, inputDir, outputDir string) {
	cfg, err := config.Load()
	if err != nil {
		return
	}
	changed := false
	if inputDir != "" && cfg.LastInputDir != inputDir {
		cfg.LastInputDir = inputDir
		changed = true
	}
	if outputDir != "" && cfg.LastOutputDir != outputDir {
		cfg.LastOutputDir = outputDir
		changed = true
	}
	if changed {
		if err := config.Save(cfg); err != nil {
			log.Warn("could not remember folders", "err", err)
		}
	}
}

func resolveCacheDir() string {
	if c, err := config.Load(); err == nil && c.CacheDir != "" {
		return c.CacheDir
	}
	return defaultCacheDir()
}

func defaultCacheDir() string {
	if d, err := cache.DefaultDir(); err == nil {
		return d
	}
	return ".celestory-cache"
}

// isInteractive reports whether stdin is a terminal (so the wizard is usable).
func isInteractive() bool {
	fi, err := os.Stdin.Stat()
	if err != nil {
		return false
	}
	return fi.Mode()&os.ModeCharDevice != 0
}

// validateInputDir reports an error when dir does not exist or is not a
// folder — a missing or unmounted path (e.g. an unplugged external drive)
// needs a fix, not a bug report.
func validateInputDir(dir string) error {
	info, err := os.Stat(dir)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("%s is not a directory", dir)
	}
	return nil
}
