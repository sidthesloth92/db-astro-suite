package main

import (
	"bufio"
	"context"
	"errors"
	"fmt"
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

// run executes the full pipeline: resolve inputs → scan → aggregate → write
// celestory.json. The result is uploaded to the Celestory web app to visualise.
func run(f cliFlags) error {
	if f.showConfig {
		return showConfig(f)
	}

	// Persist a configured username (just an identifier, never a password).
	if f.profileSet {
		if err := config.SetProfileID(f.profile); err != nil {
			return err
		}
		if f.profile == "" {
			fmt.Println("Cleared your Celestory username.")
		} else {
			fmt.Println("Saved your Celestory username:", f.profile)
		}
	}

	// Standalone cumulative-index maintenance operations.
	if f.reset {
		return resetLibrary(f.assumeYes)
	}
	if f.forget != "" {
		return forgetRoot(f.forget, f.assumeYes)
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
			fmt.Println("Cancelled.")
			return nil
		}
		sourceDir = choices.SourceDir
		baseOut = choices.OutputDir
		cfg.ProfileID = choices.ProfileID
		_ = config.Save(cfg)
	} else if sourceDir == "" {
		flagUsage()
		return errors.New("no folder given: pass -input <dir>, or run with no arguments for the guided wizard")
	}

	jsonPath, err := resolveOutputs(baseOut)
	if err != nil {
		return err
	}

	// Remember the input + output folders so the next interactive run pre-fills them.
	rememberDirs(sourceDir, filepath.Dir(jsonPath))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	var c *cache.Cache
	if !f.noCache {
		c, err = cache.Open(cacheDir, sourceDir, f.verifyHash)
		if err != nil {
			return err
		}
		if f.rebuildCache {
			c.Clear()
		}
	}

	reader := func(p string) (astrofits.Metadata, error) { return astrofits.ReadMetadata(p) }

	prog := newProgressReporter(os.Stderr, os.Stderr.Fd())
	res, err := scan.Scan(ctx, scan.Options{
		Root:       sourceDir,
		Reader:     reader,
		Cache:      asScanCache(c),
		OnProgress: prog.update,
	})
	prog.clear()
	if err != nil {
		if errors.Is(err, context.Canceled) {
			fmt.Println("\nCancelled.")
			return nil
		}
		return err
	}
	if res.Total == 0 {
		fmt.Println("No FITS files found under", sourceDir)
		return nil
	}

	// Fold this scan into the cumulative library index, then build the story
	// from the union across every disk ever scanned — not just this folder.
	lights, _ := aggregate.Enrich(res.Frames)
	idx, err := library.Open(libraryDir())
	if err != nil {
		return err
	}
	if f.fresh {
		if !confirmDestructive("Wipe the cumulative library index and rebuild from this scan? (FITS files are untouched)", f.assumeYes) {
			fmt.Println("Cancelled.")
			return nil
		}
		idx.Reset()
	}
	idx.Merge(sourceDir, lights, f.keepDeleted)

	// Scope the duplicate report to the folder just scanned (unless -all-duplicates):
	// a set sitting entirely on another, possibly-disconnected disk isn't actionable
	// from this run. Integration totals stay full-library regardless.
	dupRoot := ""
	if !f.allDuplicates {
		if abs, absErr := filepath.Abs(sourceDir); absErr == nil {
			dupRoot = abs
		} else {
			dupRoot = sourceDir
		}
	}
	union := idx.Union()
	story := aggregate.Assemble(union, res.Skipped, model.ToolInfo{Name: "celestory", Version: version}, dupRoot)
	hiddenDupSets := aggregate.OutsideRootDuplicateSets(union, dupRoot)

	// Stamp a stable, privacy-preserving identity for deduped attempt counting.
	if installID, idErr := config.EnsureInstallID(); idErr == nil {
		story.InstallID = installID
	} else {
		fmt.Fprintln(os.Stderr, "warning: could not read install id:", idErr)
	}
	if cfg, cErr := config.Load(); cErr == nil {
		story.ProfileID = cfg.ProfileID
	}
	story.DataFingerprint = fingerprint.Compute(story)

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
	printRunSummary(story, jsonPath, hiddenDupSets)
	saveCache(c)
	if err := idx.Save(); err != nil {
		fmt.Fprintln(os.Stderr, "warning: could not write library index:", err)
	}
	return nil
}

// libraryDir returns where the cumulative index lives (the Celestory config dir).
func libraryDir() string {
	if d, err := library.DefaultDir(); err == nil {
		return d
	}
	return ".celestory"
}

// resetLibrary wipes the entire cumulative index after confirmation. FITS files
// are never touched — the user rebuilds by re-scanning.
func resetLibrary(assumeYes bool) error {
	idx, err := library.Open(libraryDir())
	if err != nil {
		return err
	}
	if !confirmDestructive("Wipe your entire cumulative library index? (FITS files are untouched; re-scan to rebuild)", assumeYes) {
		fmt.Println("Cancelled.")
		return nil
	}
	idx.Reset()
	if err := idx.Save(); err != nil {
		return err
	}
	fmt.Println("Cumulative library index wiped. Re-scan your folders to rebuild it.")
	return nil
}

// forgetRoot drops a single folder partition from the cumulative index.
func forgetRoot(root string, assumeYes bool) error {
	idx, err := library.Open(libraryDir())
	if err != nil {
		return err
	}
	if !confirmDestructive(fmt.Sprintf("Forget %q from your cumulative library index?", root), assumeYes) {
		fmt.Println("Cancelled.")
		return nil
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
// With assumeYes it proceeds silently; on a non-interactive stdin without
// assumeYes it refuses (returns false) so scripts must opt in via -yes.
func confirmDestructive(prompt string, assumeYes bool) bool {
	if assumeYes {
		return true
	}
	if !isInteractive() {
		fmt.Fprintln(os.Stderr, "refusing without confirmation; re-run with -yes to proceed")
		return false
	}
	fmt.Printf("%s [y/N]: ", prompt)
	scanner := bufio.NewScanner(os.Stdin)
	if !scanner.Scan() {
		return false
	}
	answer := strings.ToLower(strings.TrimSpace(scanner.Text()))
	return answer == "y" || answer == "yes"
}

func asScanCache(c *cache.Cache) scan.Cache {
	if c == nil {
		return nil
	}
	return c
}

func saveCache(c *cache.Cache) {
	if c == nil {
		return
	}
	if err := c.Save(); err != nil {
		fmt.Fprintln(os.Stderr, "warning: could not write cache:", err)
	}
}

// rememberDirs persists the scanned and output folders so the wizard can
// pre-fill them on the next run. Best-effort: failures are non-fatal and
// silently ignored; the config is written only when something changed.
func rememberDirs(inputDir, outputDir string) {
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
		_ = config.Save(cfg)
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

func showConfig(f cliFlags) error {
	cfgPath, _ := config.Path()
	out := f.out
	if out == "" {
		cwd, _ := os.Getwd()
		out = cwd + "  (current directory — override with -out)"
	}
	fmt.Println("Output location:", out)
	fmt.Println("Cache directory:", resolveCacheDir())
	fmt.Println("History index:  ", library.IndexPath(libraryDir()))
	fmt.Println("Config file:    ", cfgPath)
	return nil
}
