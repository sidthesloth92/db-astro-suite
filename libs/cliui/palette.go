// Package cliui holds the shared DB Astro Suite terminal-UI palette and the
// common lipgloss styles used across the suite's command-line tools, so the
// brand colours live in one place instead of being duplicated per CLI.
//
// Consumed via a replace directive (the suite's CLIs ship as goreleaser-built
// binaries, not via `go install`), so there is no version tag to maintain.
//
// lipgloss strips colour automatically when stdout is not a terminal (e.g.
// piped output), so callers get plain text in scripts without extra work.
package cliui

import "github.com/charmbracelet/lipgloss"

// Brand palette — the canonical DB Astro Suite CLI colours. Build tool-specific
// styles from these consts rather than hardcoding hex values, so a palette
// change in one place updates every CLI.
const (
	ColorHeading   lipgloss.Color = "#A78BFA" // violet — section headings
	ColorValue     lipgloss.Color = "#C4B5FD" // light violet — emphasised values
	ColorBrandDeep lipgloss.Color = "#8B5CF6" // deep violet — gradient end stop
	ColorOK        lipgloss.Color = "#34D3C4" // teal — success / positive counts
	ColorWarn      lipgloss.Color = "#F59E0B" // amber — warnings
	ColorFail      lipgloss.Color = "#EC4899" // pink — failures / strong accent
	ColorDim       lipgloss.Color = "#9CA3AF" // grey — secondary text
	ColorMuted     lipgloss.Color = "#6B7280" // dim grey — footer / least emphasis
	ColorTrough    lipgloss.Color = "#3F3F5A" // slate — progress-bar trough
)
