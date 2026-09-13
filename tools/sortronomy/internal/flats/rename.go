// Package flats implements the master-flat rename helper.
// Each file in InputDir is copied to OutputDir under a new name derived from
// the substring after its last underscore.
package flats

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/fsutil"
)

// Options collects the user choices for the rename-flats flow.
type Options struct {
	InputDir  string
	OutputDir string
	Confirmed bool
}

// Run executes the rename pipeline:
//
//   - Walk InputDir top-level (non-recursive, matching the Python script).
//   - Skip hidden files and any without an underscore.
//   - For each remaining file, copy to OutputDir under the substring after
//     its last underscore.
//
// Existing destination files are left alone (re-run idempotent).
func Run(opts Options) error {
	if err := os.MkdirAll(opts.OutputDir, 0o755); err != nil {
		return err
	}
	entries, err := os.ReadDir(opts.InputDir)
	if err != nil {
		return err
	}

	var copied, alreadyExisted, skipped, failed int
	for _, e := range entries {
		if e.IsDir() || strings.HasPrefix(e.Name(), ".") {
			continue
		}
		idx := strings.LastIndex(e.Name(), "_")
		if idx < 0 {
			fmt.Fprintf(os.Stderr, "  %s — skipped: no underscore\n", e.Name())
			skipped++
			continue
		}
		newName := strings.TrimSpace(e.Name()[idx+1:])
		if newName == "" {
			fmt.Fprintf(os.Stderr, "  %s — skipped: empty name after underscore\n", e.Name())
			skipped++
			continue
		}
		src := filepath.Join(opts.InputDir, e.Name())
		dst := filepath.Join(opts.OutputDir, newName)

		// Detect "already exists" so the summary reports it accurately —
		// CopyFile itself is a no-op when dst exists.
		exists := false
		if _, statErr := os.Stat(dst); statErr == nil {
			exists = true
		} else if !errors.Is(statErr, fs.ErrNotExist) {
			fmt.Fprintf(os.Stderr, "  %s — stat error: %v\n", e.Name(), statErr)
			failed++
			continue
		}

		if err := fsutil.CopyFile(src, dst); err != nil {
			fmt.Fprintf(os.Stderr, "  %s — copy error: %v\n", e.Name(), err)
			failed++
			continue
		}
		if exists {
			fmt.Printf("  %s — already at %s, left alone\n", e.Name(), newName)
			alreadyExisted++
			continue
		}
		fmt.Printf("  %s → %s\n", e.Name(), newName)
		copied++
	}

	fmt.Println()
	fmt.Printf("Done. Copied: %d   Already existed: %d   Skipped: %d   Failed: %d\n",
		copied, alreadyExisted, skipped, failed)
	if failed > 0 {
		return fmt.Errorf("%d file(s) failed", failed)
	}
	return nil
}
