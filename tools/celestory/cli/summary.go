package main

import (
	"flag"
	"fmt"
	"math"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/cache"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
)

// maxDuplicateSetsPrinted caps how many duplicate sets are listed on the
// terminal so a large library can't flood it.
const maxDuplicateSetsPrinted = 20

// webAppURL is the Celestory web app users drop their celestory.json onto to
// visualise their journey — everything renders client-side, nothing is uploaded.
const webAppURL = "https://celestory.dbastrosuite.com"

// Styles for the "Next steps" call-to-action.
var (
	stepHeader = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#A78BFA"))
	stepNum    = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#34D3C4"))
	stepURL    = lipgloss.NewStyle().Bold(true).Underline(true).Foreground(lipgloss.Color("#34D3C4"))
	stepFile   = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#EC4899"))
	stepDim    = lipgloss.NewStyle().Foreground(lipgloss.Color("#9CA3AF"))
)

// Styles for the duplicate report.
var (
	dupHeader = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#F59E0B"))
	dupObject = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#C4B5FD"))
	dupKeep   = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#34D3C4"))
	dupRemove = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#EC4899"))
	dupDim    = lipgloss.NewStyle().Foreground(lipgloss.Color("#9CA3AF"))
)

func flagUsage() { flag.Usage() }

// printRunSummary prints the headline stats, duplicate report, the celestory.json
// path, the cache location, and how to visualise the result in the web app.
func printRunSummary(ledger model.Ledger, jsonPath string, c *cache.Cache) {
	s := ledger.Summary
	fmt.Println()
	fmt.Printf("Done — %d object(s) · %s total · %d night(s) · %d light frame(s)\n",
		s.ObjectCount, formatDuration(s.TotalIntegrationSeconds), s.NightCount, s.LightFrameCount)

	if len(ledger.Skipped) > 0 {
		fmt.Printf("Skipped %d unreadable file(s) (see celestory.json → skipped).\n", len(ledger.Skipped))
	}
	printDuplicates(ledger)

	fmt.Println("\nSaved:", jsonPath)
	if c != nil {
		fmt.Println("Cache:", c.Path())
	}

	printNextSteps()
}

// printNextSteps prints the post-scan call-to-action as a clear, numbered list
// so the user can see exactly what to do with their celestory.json.
func printNextSteps() {
	fmt.Println()
	fmt.Println("  " + stepHeader.Render("✦ Next steps"))
	fmt.Printf("    %s  Open  %s\n", stepNum.Render("1."), stepURL.Render(webAppURL))
	fmt.Printf("    %s  Drop your  %s  onto the page\n", stepNum.Render("2."), stepFile.Render("celestory.json"))
	fmt.Printf("    %s  Explore your journey\n", stepNum.Render("3."))
	fmt.Println("       " + stepDim.Render("It renders entirely in your browser — nothing is uploaded."))
}

// printDuplicates renders the duplicate report as a scannable, colour-coded
// list: one block per set with a ✓ keep / ✗ delete marker on each path, so the
// user can see at a glance exactly which copies are safe to remove.
func printDuplicates(ledger model.Ledger) {
	dups := ledger.Duplicates
	if len(dups) == 0 {
		return
	}
	s := ledger.Summary

	fmt.Println()
	fmt.Println("  " + dupHeader.Render(fmt.Sprintf("⚠ Duplicates — %d set(s), %s (~%s reclaimable)",
		len(dups), countNoun(s.DuplicateFileCount, "redundant copy", "redundant copies"),
		formatBytes(s.DuplicateWastedBytes))))
	fmt.Println("    " + dupDim.Render("The same exposure was found at more than one path — it's counted once; the extra copies only use disk."))

	limit := len(dups)
	if limit > maxDuplicateSetsPrinted {
		limit = maxDuplicateSetsPrinted
	}
	for _, d := range dups[:limit] {
		fmt.Println()
		fmt.Println("    " + dupObject.Render(dupHeading(d)))
		for n, p := range d.Paths {
			if n == 0 {
				fmt.Printf("      %s  %s\n", dupKeep.Render("✓ keep  "), dupDim.Render(p))
			} else {
				fmt.Printf("      %s  %s\n", dupRemove.Render("✗ delete"), p)
			}
		}
	}
	if len(dups) > limit {
		fmt.Println("\n    " + dupDim.Render(fmt.Sprintf("(+%d more — see celestory.json → duplicates)", len(dups)-limit)))
	}

	fmt.Println()
	fmt.Println("    " + dupDim.Render("Tip: delete the ✗ copies, then re-run celestory — these clear automatically."))
}

// dupHeading builds the one-line summary for a duplicate set: object · date · size.
func dupHeading(d model.DuplicateSet) string {
	head := d.Designation
	if when := dupDisplayDate(d.DateObs); when != "" {
		head += " · " + when
	}
	return head + " · " + formatBytes(d.SizeBytes) + " each"
}

// dupDisplayDate turns an RFC3339 DATE-OBS into a compact "2006-01-02 15:04 UTC"
// label; returns "" for undated frames (identity came from the content fallback).
func dupDisplayDate(rfc3339 string) string {
	if rfc3339 == "" {
		return ""
	}
	t, err := time.Parse(time.RFC3339, rfc3339)
	if err != nil {
		return rfc3339
	}
	return t.UTC().Format("2006-01-02 15:04 UTC")
}

// countNoun renders "1 thing" / "N things" with the right singular/plural noun.
func countNoun(n int, singular, plural string) string {
	if n == 1 {
		return fmt.Sprintf("%d %s", n, singular)
	}
	return fmt.Sprintf("%d %s", n, plural)
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
