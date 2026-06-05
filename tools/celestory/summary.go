package main

import (
	"flag"
	"fmt"
	"math"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/internal/cache"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/internal/model"
)

// maxDuplicateSetsPrinted caps how many duplicate sets are listed on the
// terminal so a large library can't flood it.
const maxDuplicateSetsPrinted = 20

func flagUsage() { flag.Usage() }

// printRunSummary prints the headline stats, duplicate report, output paths,
// and cache location after a run. Pass an empty htmlPath in serve mode.
func printRunSummary(ledger model.Ledger, jsonPath, htmlPath string, c *cache.Cache) {
	s := ledger.Summary
	fmt.Println()
	fmt.Printf("Done — %d object(s) · %s total · %d night(s) · %d light frame(s)\n",
		s.ObjectCount, formatDuration(s.TotalIntegrationSeconds), s.NightCount, s.LightFrameCount)

	if len(ledger.Skipped) > 0 {
		fmt.Printf("Skipped %d unreadable file(s) (see ledger.json → skipped).\n", len(ledger.Skipped))
	}
	printDuplicates(ledger)

	fmt.Println("\nSaved:", jsonPath)
	if htmlPath != "" {
		fmt.Println("Saved:", htmlPath)
	}
	if c != nil {
		fmt.Println("Cache:", c.Path())
	}
}

func printDuplicates(ledger model.Ledger) {
	dups := ledger.Duplicates
	if len(dups) == 0 {
		return
	}
	s := ledger.Summary
	fmt.Printf("\n⚠ Duplicates — %d file(s) across %d set(s) (~%s redundant):\n",
		s.DuplicateFileCount, len(dups), formatBytes(s.DuplicateWastedBytes))

	limit := len(dups)
	if limit > maxDuplicateSetsPrinted {
		limit = maxDuplicateSetsPrinted
	}
	for _, d := range dups[:limit] {
		fmt.Printf("  • %s · %s · %s\n", d.Designation, d.DateObs, formatBytes(d.SizeBytes))
		for _, p := range d.Paths {
			fmt.Println("      " + p)
		}
	}
	if len(dups) > limit {
		fmt.Printf("  (+%d more — see ledger.json → duplicates)\n", len(dups)-limit)
	}
}

func formatDuration(seconds float64) string {
	total := int(math.Round(seconds))
	h := total / 3600
	m := (total % 3600) / 60
	return fmt.Sprintf("%dh %dm", h, m)
}

func formatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}
